import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Input, Card } from 'react-native-elements';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

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
      Alert.alert('ስህተት', 'ምርቶችን ማከል በአድሚኖች ብቻ ይቻላል');
      return;
    }

    try {
      setLoading(true);
      const response = await authApi.addProduct({
        ...values,
        status: 'in_store',
      });

      if (response.success) {
        Alert.alert(
          'ስኬት',
          'ምርቱ በትክክል ታከለ',
          [{ text: 'OK', onPress: () => {
            resetForm();
            navigation.navigate('ProductList');
          }}]
        );
      } else {
        Alert.alert('ስህተት', response.message || 'ምርት ማከል አልተሳካም');
      }
    } catch (err) {
      Alert.alert('ስህተት', 'ምርት ማከል አልተሳካም');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <Card.Title h4>አዲስ ምርት ያክሉ</Card.Title>
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
                label="የምርት ስም (Product Name)"
                placeholder="የምርት ስም"
                onChangeText={handleChange('name')}
                onBlur={handleBlur('name')}
                value={values.name}
                errorMessage={touched.name && errors.name}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Input
                label="መግለጫ - አማራጭ (Description - Optional)"
                placeholder="የምርቱን መግለጫ"
                onChangeText={handleChange('description')}
                onBlur={handleBlur('description')}
                value={values.description}
                multiline
                numberOfLines={3}
                labelStyle={{ color: 'black' }}
                placeholderTextColor="#888"
              />

              <Input
                label="ብዛት (Quantity)"
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
                label="የማምጫ ዋጋ ($) (Import Price)"
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
                label="የሽያጭ ዋጋ ($) (Selling Price)"
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
