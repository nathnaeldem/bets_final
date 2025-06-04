import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Text, Button, Card, Input, Icon } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

const SalesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantitySold, setQuantitySold] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await authApi.getProducts();
      const availableProducts = response.products.filter(
        (product) => product.status === 'in_store' && product.quantity > 0
      );
      setProducts(availableProducts);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setQuantitySold('');
    setSoldPrice(product.selling_price.toString());
    setComment('');
    setPaymentMethod('cash');
  };

  const calculateTotalPrice = () => {
    const qty = parseInt(quantitySold) || 0;
    const price = parseFloat(soldPrice) || 0;
    return (qty * price).toFixed(2);
  };

  const handleSale = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    const qty = parseInt(quantitySold);
    const price = parseFloat(soldPrice);

    if (!qty || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!price || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (qty > selectedProduct.quantity) {
      Alert.alert('Error', 'Quantity exceeds available stock');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setProcessing(true);

      await authApi.sellProduct({
        product_id: selectedProduct.id,
        quantity_sold: qty,
        sold_price: price,
        payment_method: paymentMethod,
        comment: comment,
      });

      Alert.alert('Success', 'Product sold successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedProduct(null);
            fetchProducts();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const renderProductItem = ({ item }) => (
    <Card containerStyle={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Icon
            name="box-open"
            type="font-awesome-5"
            size={22}
            color="#2980b9"
            containerStyle={{ marginRight: 8 }}
          />
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <Card.Divider />

        <View style={styles.productInfo}>
          <View style={styles.infoRow}>
            <Icon
              name="boxes"
              type="font-awesome-5"
              size={18}
              color="#34495e"
              containerStyle={styles.iconSpacing}
            />
            <Text style={styles.label}>Available:</Text>
            <Text style={styles.value}>{item.quantity} units</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon
              name="tag"
              type="font-awesome"
              size={18}
              color="#34495e"
              containerStyle={styles.iconSpacing}
            />
            <Text style={styles.label}>Price:</Text>
            <Text style={styles.value}>${item.selling_price}</Text>
          </View>
          {item.description && (
            <View style={styles.infoRow}>
              <Icon
                name="info-circle"
                type="font-awesome"
                size={18}
                color="#34495e"
                containerStyle={styles.iconSpacing}
              />
              <Text style={styles.label}>Desc:</Text>
              <Text style={styles.value}>{item.description}</Text>
            </View>
          )}
        </View>

        <Button
          title={selectedProduct?.id === item.id ? 'Selected' : 'Select for Sale'}
          onPress={() => selectProduct(item)}
          buttonStyle={[
            styles.selectButton,
            selectedProduct?.id === item.id && styles.selectedButton,
          ]}
          titleStyle={styles.selectButtonText}
          icon={
            <Icon
              name={selectedProduct?.id === item.id ? 'check-circle' : 'cart-plus'}
              type="font-awesome"
              color="#fff"
              containerStyle={{ marginRight: 6 }}
            />
          }
        />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2980b9" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flexContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Icon
          name="shopping-cart"
          type="font-awesome"
          size={24}
          color="#fff"
          containerStyle={{ marginRight: 10 }}
        />
        <Text style={styles.headerTitle}>Product Sales</Text>
      </View>

      {!selectedProduct ? (
        <View style={styles.productListContainer}>
          <Text style={styles.sectionTitle}>Select a Product to Sell</Text>
          {products.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.noProductsText}>
                No products available for sale
              </Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProductItem}
              contentContainerStyle={styles.list}
              nestedScrollEnabled={true}
              removeClippedSubviews={false}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            />
          )}
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            style={styles.saleFormContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={90}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Selected Product Card */}
              <Card containerStyle={styles.selectedProductCard}>
                <View style={styles.cardHeader}>
                  <Icon
                    name="tag"
                    type="font-awesome"
                    size={22}
                    color="#27ae60"
                    containerStyle={{ marginRight: 8 }}
                  />
                  <Text style={styles.cardTitle}>{selectedProduct.name}</Text>
                </View>
                <Card.Divider />
                <Text style={styles.selectedProductInfo}>
                  Available: {selectedProduct.quantity} units
                </Text>
                <Text style={styles.selectedProductInfo}>
                  Suggested Price: ${selectedProduct.selling_price}
                </Text>
              </Card>

              {/* Quantity and Price in Row */}
              <View style={styles.rowContainer}>
                <View style={styles.inputColumn}>
                  <Input
                    label="Quantity to Sell"
                    placeholder="Enter quantity"
                    value={quantitySold}
                    onChangeText={setQuantitySold}
                    keyboardType="numeric"
                    leftIcon={{
                      type: 'font-awesome-5',
                      name: 'warehouse',
                      color: '#2980b9',
                    }}
                    returnKeyType="done"
                    containerStyle={styles.inputField}
                  />
                </View>
                
                <View style={styles.inputColumn}>
                  <Input
                    label="Price per Unit"
                    placeholder="Enter price"
                    value={soldPrice}
                    onChangeText={setSoldPrice}
                    keyboardType="numeric"
                    leftIcon={{
                      type: 'font-awesome-5',
                      name: 'dollar-sign',
                      color: '#2980b9',
                    }}
                    returnKeyType="done"
                    containerStyle={styles.inputField}
                  />
                </View>
              </View>

              {/* Total Price Display */}
              {quantitySold && soldPrice && (
                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>
                    Total: ${calculateTotalPrice()}
                  </Text>
                </View>
              )}

              {/* Comment Input */}
              <Input
                label="Comment (Optional)"
                placeholder="Enter any comments"
                value={comment}
                onChangeText={setComment}
                multiline
                leftIcon={{
                  type: 'font-awesome',
                  name: 'comment',
                  color: '#2980b9',
                }}
                returnKeyType="default"
                containerStyle={styles.inputField}
              />

              {/* Payment Method */}
              <View style={styles.paymentContainer}>
                <Text style={styles.paymentLabel}>Payment Method:</Text>
                <View style={styles.paymentButtons}>
                  <Button
                    title="Cash"
                    onPress={() => setPaymentMethod('cash')}
                    buttonStyle={[
                      styles.paymentButton,
                      paymentMethod === 'cash' && styles.selectedPayment,
                    ]}
                    icon={
                      <Icon
                        name="money-bill-wave"
                        type="font-awesome-5"
                        color="#fff"
                        containerStyle={{ marginRight: 6 }}
                      />
                    }
                  />
                  <Button
                    title="Credit"
                    onPress={() => setPaymentMethod('credit')}
                    buttonStyle={[
                      styles.paymentButton,
                      paymentMethod === 'credit' && styles.selectedPayment,
                    ]}
                    icon={
                      <Icon
                        name="credit-card"
                        type="font-awesome"
                        color="#fff"
                        containerStyle={{ marginRight: 6 }}
                      />
                    }
                  />
                  <Button
                    title="Transfer"
                    onPress={() => setPaymentMethod('account_transfer')}
                    buttonStyle={[
                      styles.paymentButton,
                      paymentMethod === 'account_transfer' && styles.selectedPayment,
                    ]}
                    icon={
                      <Icon
                        name="exchange-alt"
                        type="font-awesome-5"
                        color="#fff"
                        containerStyle={{ marginRight: 6 }}
                      />
                    }
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Cancel"
                  onPress={() => setSelectedProduct(null)}
                  buttonStyle={styles.cancelButton}
                  titleStyle={styles.cancelButtonText}
                />
                <Button
                  title="Complete Sale"
                  onPress={handleSale}
                  loading={processing}
                  disabled={processing}
                  buttonStyle={styles.saleButton}
                  titleStyle={styles.saleButtonText}
                  icon={
                    <Icon
                      name="check-circle"
                      type="font-awesome-5"
                      color="#fff"
                      containerStyle={{ marginRight: 6 }}
                    />
                  }
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2980b9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  productListContainer: {
    flex: 1,
    minHeight: 1,
  },
  saleFormContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 16,
    color: '#2c3e50',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardInner: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  productInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconSpacing: {
    width: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    width: '30%',
  },
  value: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    flexWrap: 'wrap',
  },
  selectButton: {
    backgroundColor: '#2980b9',
    borderRadius: 6,
    paddingVertical: 10,
  },
  selectedButton: {
    backgroundColor: '#27ae60',
  },
  selectButtonText: {
    fontWeight: 'bold',
  },
  noProductsText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  selectedProductCard: {
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedProductInfo: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputInner: {
    borderBottomWidth: 1,
    borderBottomColor: '#bdc3c7',
  },
  totalContainer: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  paymentContainer: {
    marginVertical: 18,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2c3e50',
  },
  paymentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paymentButton: {
    minWidth: 100,
    backgroundColor: '#2980b9',
    borderRadius: 20,
    paddingVertical: 8,
    marginBottom: 10,
    flexGrow: 1,
    marginHorizontal: 5,
  },
  selectedPayment: {
    backgroundColor: '#27ae60',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 6,
    flex: 0.45,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontWeight: 'bold',
  },
  saleButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 6,
    flex: 0.45,
    paddingVertical: 12,
  },
  saleButtonText: {
    fontWeight: 'bold',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputField: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
});

export default SalesScreen;