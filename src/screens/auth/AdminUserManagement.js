import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = 'https://googsites.pro.et/auth.php';

const adminApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

axiosRetry(adminApi, {
  retries: 3,
  retryDelay: retryCount => retryCount * 1000,
  retryCondition: error =>
    axiosRetry.isNetworkError(error) || axiosRetry.isIdempotentRequestError(error),
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`Admin API retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
  },
});

export default function AdminUserManagement() {
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    current_password: '',
    new_password: '',
  });
  const [loading, setLoading] = useState(false);

  const callApi = async (action, body) => {
    try {
      if (action === 'change_password') {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          delete adminApi.defaults.headers.common['Authorization'];
        }
      } else {
        delete adminApi.defaults.headers.common['Authorization'];
      }

      const response = await adminApi.post(
        '',
        body,
        { params: { action } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!form.username || !form.email || !form.password) {
          throw new Error('Username, email, and password are required.');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          throw new Error('Please enter a valid email address.');
        }

        // look up current admin's organization_id
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) {
          throw new Error('Unable to determine your organization.');
        }
        const { organization_id } = JSON.parse(storedUser);
        const {organization_name} = JSON.parse(storedUser);

        const response = await callApi('register', {
          username:        form.username,
          email:           form.email,
          password:        form.password,
          organization_id: organization_id,
          organization_name               // inject org ID instead of name
        });

        if (response.success || response.message.includes('success')) {
          Alert.alert('Success', response.message || 'User registered successfully.');
        } else {
          throw new Error(response.message || 'Registration failed.');
        }

      } else {
        if (!form.current_password || !form.new_password) {
          throw new Error('Current password and new password are required.');
        }
        if (form.new_password.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }

        const response = await callApi('change_password', {
          current_password: form.current_password,
          new_password:     form.new_password,
        });

        if (response.success || response.message.includes('success')) {
          Alert.alert('Success', response.message || 'Password changed successfully.');
        } else {
          throw new Error(response.message || 'Password change failed.');
        }
      }

      setForm({
        username: '',
        email: '',
        password: '',
        current_password: '',
        new_password: '',
      });

    } catch (err) {
      let errorMessage = err.message;
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (!err.response) {
          errorMessage = 'Network error: No response from server.';
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={[styles.switchBtn, mode === 'register' && styles.activeSwitch]}
          onPress={() => setMode('register')}
        >
          <Text style={[styles.switchText, mode === 'register' && styles.activeSwitchText]}>
            Register User
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, mode === 'change_password' && styles.activeSwitch]}
          onPress={() => setMode('change_password')}
        >
          <Text style={[styles.switchText, mode === 'change_password' && styles.activeSwitchText]}>
            Change Password
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        {mode === 'register' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={form.username}
              onChangeText={t => setForm(f => ({ ...f, username: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={t => setForm(f => ({ ...f, email: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={form.password}
              onChangeText={t => setForm(f => ({ ...f, password: t }))}
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              secureTextEntry
              value={form.current_password}
              onChangeText={t => setForm(f => ({ ...f, current_password: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={form.new_password}
              onChangeText={t => setForm(f => ({ ...f, new_password: t }))}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'register' ? 'Register' : 'Change Password'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  switchContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeSwitch: {
    backgroundColor: '#007AFF',
  },
  switchText: {
    fontSize: 16,
    color: '#333',
  },
  activeSwitchText: {
    color: '#fff',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
