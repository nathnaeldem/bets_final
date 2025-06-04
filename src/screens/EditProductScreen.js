import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Input, Text } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

const EditProductScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const { user } = useAuth();
  
  // Form state
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [importPrice, setImportPrice] = useState(product.import_price.toString());
  const [sellingPrice, setSellingPrice] = useState(product.selling_price.toString());
  const [quantity, setQuantity] = useState(product.quantity.toString());
  const [status, setStatus] = useState(product.status);
  const [loading, setLoading] = useState(false);

  const handleUpdateProduct = async () => {
    try {
      setLoading(true);
      
      const updatedProduct = {
        product_id: product.id,
        name,
        description,
        import_price: parseFloat(importPrice),
        selling_price: parseFloat(sellingPrice),
        quantity: parseInt(quantity),
        status
      };

      await authApi.updateProduct(updatedProduct);
      Alert.alert('Success', 'Product updated successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Input
        label="Product Name"
        value={name}
        onChangeText={setName}
        placeholder="Enter product name"
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Enter product description"
        multiline
      />

      <Input
        label="Import Price"
        value={importPrice}
        onChangeText={setImportPrice}
        keyboardType="numeric"
      />

      <Input
        label="Selling Price"
        value={sellingPrice}
        onChangeText={setSellingPrice}
        keyboardType="numeric"
      />

      <Input
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />

      <Button
        title="Save Changes"
        loading={loading}
        onPress={handleUpdateProduct}
        buttonStyle={styles.saveButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  saveButton: {
    backgroundColor: '#3498db',
    marginTop: 20,
  }
});

export default EditProductScreen;