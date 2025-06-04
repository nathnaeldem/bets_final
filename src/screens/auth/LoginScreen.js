import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Input, Button } from 'react-native-elements';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../context/AuthContext';

const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
});

const LoginScreen = ({ navigation }) => {
  const { login, error } = useAuth();
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // In LoginScreen.js
const handleLogin = async (values) => {
  try {
    const success = await login(values.username, values.password);
    if (!success) {
      Alert.alert('Login Failed', error || 'Invalid credentials');
    }
  } catch (e) {
    Alert.alert('Error', e.message || 'Login failed');
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text h3 style={styles.headerText}>Shop Management</Text>
        <Text style={styles.subHeaderText}>Login to your account</Text>
      </View>

      <Formik
        initialValues={{ username: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleLogin}
      >
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <View style={styles.formContainer}>
            <Input
              placeholder="Username"
              leftIcon={{ type: 'font-awesome', name: 'user', size: 20, color: '#86939e' }}
              onChangeText={handleChange('username')}
              value={values.username}
              autoCapitalize="none"
              errorMessage={touched.username && errors.username}
              containerStyle={styles.inputContainer}
            />

            <Input
              placeholder="Password"
              leftIcon={{ type: 'font-awesome', name: 'lock', size: 20, color: '#86939e' }}
              rightIcon={{
                type: 'font-awesome',
                name: secureTextEntry ? 'eye-slash' : 'eye',
                size: 20,
                color: '#86939e',
                onPress: () => setSecureTextEntry(!secureTextEntry),
              }}
              onChangeText={handleChange('password')}
              value={values.password}
              secureTextEntry={secureTextEntry}
              errorMessage={touched.password && errors.password}
              containerStyle={styles.inputContainer}
            />

            <Button
              title="Login"
              onPress={handleSubmit}
              buttonStyle={styles.loginButton}
              titleStyle={styles.loginButtonText}
            />

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Formik>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5', // Light grey background for a modern look
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#34495e', // Darker shade for text
    fontSize: 28, // Larger font size for emphasis
  },
  subHeaderText: {
    fontSize: 18,
    color: '#95a5a6', // Softer grey for subheader
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#ffffff', // White background for form
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5, // Elevation for Android shadow
  },
  inputContainer: {
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#1abc9c', // Modern teal color
    borderRadius: 25,
    height: 50,
    marginTop: 20,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  signupText: {
    color: '#1abc9c',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default LoginScreen;