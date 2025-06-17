import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Input, Card } from 'react-native-elements';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import axiosRetry from 'axios-retry'; // Import axios-retry
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the API URL
const API_URL = 'https://dankula.x10.mx/auth.php';

// --- Configure an Axios instance for product-related operations ---
// This instance will handle retries and timeouts for its requests
const productApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Set a timeout (e.g., 15 seconds) to trigger retries on slow responses
});

// Apply axios-retry to the productApi instance
axiosRetry(productApi, {
  retries: 3, // Number of retry attempts
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Exponential backoff: 1s, 2s, 4s
  },
  retryCondition: (error) => {
    // Retry only on network errors (timeouts, no internet, etc.)
    // or 5xx server errors (transient server issues)
    return axiosRetry.isNetworkError(error) || axiosRetry.isIdempotentRequestError(error);
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`Product API retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
    // Optionally, you could show a very subtle toast message here like "Retrying..."
  },
});
// --- End Axios instance configuration ---


const AddProductScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const ProductSchema = Yup.object().shape({
    name: Yup.string().required('የእቃ ስም ያስፈልጋል'),
    description: Yup.string(),
    quantity: Yup.number()
      .required('ብዛት አስፈላጊ ነው')
      .positive('ብዛቱ አንፃፃፊ መሆን አለበት')
      .integer('ብዛቱ ቁጥር መሆን አለበት'),
    import_price: Yup.number()
      .required('የማምጫ ዋጋ አስፈላጊ ነው')
      .positive('የማምጫ ዋጋ አንፃፃፊ መሆን አለበት'),
    selling_price: Yup.number()
      .required('የሽያጭ ዋጋ አስፈላጊ ነው')
      .positive('የሽያጭ ዋጋ አንፃፃፊ መሆን አለበት')
      .test(
        'is-greater',
        'የሽያጭ ዋጋ ከየማምጫ ዋጋ በላይ መሆን አለበት',
        function(value) {
          return value > this.parent.import_price;
        }
      ),
  });

  const handleAddProduct = async (values, { resetForm }) => {
    if (user?.role !== 'admin') {
      Alert.alert('Error', 'ምርቶችን ማከል በአድሚኖች ብቻ ይቻላል');
      return;
    }

    setLoading(true); // Start loading immediately
    try {
      const token = await AsyncStorage.getItem('token');
      // No need to set headers object directly, productApi handles it
      // but we need to set the Authorization header dynamically if a token exists
      if (token) {
        productApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        // Ensure Authorization header is removed if no token
        delete productApi.defaults.headers.common['Authorization'];
      }

      const productPayload = {
        ...values,
        status: 'in_store',
      };

      // Use the configured productApi instance
      const response = await productApi.post(
        '', // Empty string because baseURL already includes the full URL
        productPayload,
        {
          params: { action: 'addProduct' },
          // Headers are already set on the productApi instance, no need to duplicate
          // headers: headers, // <-- REMOVE THIS LINE
        }
      );

      // Axios-retry will only let the error propagate if all retries fail,
      // or if the error condition is not met (e.g., 401 Unauthorized).
      if (response.status === 200 || response.status === 201) { // 200 OK or 201 Created are both valid success codes
        Alert.alert(
          'ስኬት',
          'በትክክል ተመዝግቧል ',
          [{ text: 'OK', onPress: () => {
            resetForm();
            navigation.navigate('ProductList');
          }}]
        );
      } else {
        // This block might be less frequently hit if using axios-retry effectively,
        // as 5xx errors would trigger retries. But good for non-2xx responses.
        Alert.alert('ስህተት', response.data?.message || 'ምርት ማከል አልተሳካም');
      }
    } catch (err) {
      console.error('Add product error:', err); // Log the full error object for better debugging

      let errorMessage = 'ምርት ማከል አልተሳካም';
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // Server responded with a status code outside 2xx (e.g., 400, 403, 404)
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
          errorMessage = err.response.data?.message || `Error: ${err.response.status}`;
        } else if (err.request) {
          // Request was made but no response received (after all retries)
          console.error('Request:', err.request);
          errorMessage = 'የአውታረ መረብ ችግር: ከሰርቨሩ ምላሽ አልተገኘም (ከብዙ ሙከራዎች በኋላ).'; // Network issue: no response from server (after multiple attempts).
        } else {
          // Something else happened (e.g., setting up the request)
          console.error('Error message:', err.message);
          errorMessage = err.message || 'አንድ ያልታወቀ ስህተት ተከስቷል'; // An unknown error occurred.
        }
      }

      Alert.alert('ስህተት', errorMessage);
    } finally {
      setLoading(false); // Stop loading regardless of success or failure
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title h4>አዲስ እቃ መመዝገቢያ</Card.Title>
        <Card.Divider />

        <Formik
          initialValues={{
            name: '',
            description: '',
            quantity: '',
            import_price: '',
            selling_price: ''
          }}
          validationSchema={ProductSchema}
          onSubmit={handleAddProduct}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View>
              <Input
                label="Product Name"
                placeholder="ስም"
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                value={values.name}
                errorMessage={touched.name && errors.name}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Input
                label="Description - Optional"
                placeholder="የምርቱ መግለጫ"
                onChangeText={handleChange('description')}
                onBlur={handleBlur('description')}
                value={values.description}
                multiline
                numberOfLines={3}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Input
                label="Quantity"
                placeholder="ብዛት"
                onChangeText={handleChange('quantity')}
                onBlur={handleBlur('quantity')}
                value={values.quantity}
                keyboardType="numeric"
                errorMessage={touched.quantity && errors.quantity}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Input
                label="Import Price"
                placeholder="የማምጫ ዋጋ"
                onChangeText={handleChange('import_price')}
                onBlur={handleBlur('import_price')}
                value={values.import_price}
                keyboardType="numeric"
                errorMessage={touched.import_price && errors.import_price}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Input
                label="Selling Price"
                placeholder="የሽያጭ ዋጋ"
                onChangeText={handleChange('selling_price')}
                onBlur={handleBlur('selling_price')}
                value={values.selling_price}
                keyboardType="numeric"
                errorMessage={touched.selling_price && errors.selling_price}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Button
                title="Add product"
                onPress={handleSubmit}
                buttonStyle={styles.submitButton}
                loading={loading}
                disabled={loading}
              />

              <Button
                title="Cancel"
                type="outline"
                onPress={() => navigation.goBack()}
                buttonStyle={styles.cancelButton}
                disabled={loading}
              />
            </View>
          )}
        </Formik>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 10,
  },
});

export default AddProductScreen;