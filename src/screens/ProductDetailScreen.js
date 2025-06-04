import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, Card, Icon, Overlay } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const statusOptions = ['ታዟል', 'በስቶክ', 'ተሽጧል'];
  const statusValues = ['ordered', 'in_store', 'sold'];

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await authApi.getProductDetails(productId);
      setProduct(response.product);
    } catch (err) {
      setError('Failed to load product details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const updateProductStatus = async (newStatus) => {
    try {
      setLoading(true);
      if (!product || typeof product.quantity === 'undefined') {
        Alert.alert('ስህተት', 'የንብረት መረጃ ያልተሟላ ነው።');
        setLoading(false);
        setStatusModalVisible(false);
        return;
      }
      const response = await authApi.updateProductStatus(
        productId,
        newStatus,
        product.quantity
      );
      if (response && response.success) {
        setProduct((prev) => ({ ...prev, status: newStatus }));
        Alert.alert('ተሳክቷል', 'የእቃው ሁኔታ ተቀይሯል።');
      } else {
        Alert.alert(
          'ስህተት',
          response?.message || 'የሁኔታ ማዘመን አልተሳካም።'
        );
      }
    } catch (err) {
      Alert.alert('ስህተት', 'የእቃ ሁኔታ ማዘመን አልተሳካም።');
      console.error(err);
    } finally {
      setLoading(false);
      setStatusModalVisible(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ordered':
        return '#e67e22'; // orange
      case 'in_store':
        return '#27ae60'; // green
      case 'sold':
        return '#2980b9'; // blue
      default:
        return '#7f8c8d'; // grey
    }
  };

  if (loading && !product) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="እንደገና ሞክር"
          onPress={fetchProductDetails}
          buttonStyle={styles.retryButton}
          icon={<Icon name="refresh" type="font-awesome" color="#fff" />}
        />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text>እቃ አልተገኘም</Text>
      </View>
    );
  }

  return (
    <View style={styles.flexContainer}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Card containerStyle={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Icon
              name="archive"
              type="font-awesome"
              size={28}
              color="#2980b9"
              containerStyle={{ marginRight: 10 }}
            />
            <Text style={styles.cardTitle}>{product.name}</Text>
          </View>
          <Card.Divider />

          {/* Product Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Info</Text>

            <View style={styles.infoRow}>
              <Icon
                name="info-circle"
                type="font-awesome"
                size={18}
                color="#34495e"
                containerStyle={styles.iconSpacing}
              />
              <Text style={styles.label}>መግለጫ:</Text>
              <Text style={styles.value}>
                {product.description || 'መግለጫ የለም'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Icon
                name="boxes"
                type="font-awesome-5"
                size={18}
                color="#34495e"
                containerStyle={styles.iconSpacing}
              />
              <Text style={styles.label}>ብዛት:</Text>
              <Text style={styles.value}>{product.quantity}</Text>
            </View>
          </View>

          <Card.Divider />

          {/* Finance Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finance Info</Text>

            <View style={styles.infoRow}>
              <Icon
                name="credit-card"
                type="font-awesome"
                size={18}
                color="#34495e"
                containerStyle={styles.iconSpacing}
              />
              <Text style={styles.label}>የመግቢያ ዋጋ:</Text>
              <Text style={styles.value}>${product.import_price}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon
                name="shopping-cart"
                type="font-awesome"
                size={18}
                color="#34495e"
                containerStyle={styles.iconSpacing}
              />
              <Text style={styles.label}>የሽያጭ ዋጋ:</Text>
              <Text style={styles.value}>${product.selling_price}</Text>
            </View>

            <View style={styles.infoRow}>
              <Icon
                name="chart-line"
                type="font-awesome-5"
                size={18}
                color="#34495e"
                containerStyle={styles.iconSpacing}
              />
              <Text style={styles.label}>ትርፍ:</Text>
              <Text style={styles.value}>
                ${(product.selling_price - product.import_price).toFixed(2)} (
                {(
                  ((product.selling_price - product.import_price) /
                    product.import_price) *
                  100
                ).toFixed(2)}
                %)
              </Text>
            </View>
          </View>

          <Card.Divider />

          {/* Status Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ሁኔታ</Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(product.status) },
                ]}
              >
                <Icon
                  name={
                    product.status === 'sold'
                      ? 'check-circle'
                      : product.status === 'in_store'
                      ? 'warehouse'
                      : 'truck'
                  }
                  type="font-awesome-5"
                  size={14}
                  color="#fff"
                  containerStyle={{ marginRight: 6 }}
                />
                <Text style={styles.statusText}>
                  {product.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              {user?.role === 'admin' && (
                <TouchableOpacity
                  style={styles.fab}
                  onPress={() => setStatusModalVisible(true)}
                >
                  <Icon
                    name="exchange-alt"
                    type="font-awesome-5"
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Edit Button */}
          {user?.role === 'admin' && (
            <Button
              title="Edit Product"
              icon={<Icon name="edit" type="font-awesome" color="#fff" />}
              buttonStyle={styles.editButton}
              containerStyle={{ marginTop: 20 }}
              onPress={() =>
                navigation.navigate('EditProduct', { product })
              }
            />
          )}
        </Card>
      </ScrollView>

      {/* Status Update Modal */}
      <Overlay
        isVisible={statusModalVisible}
        onBackdropPress={() => setStatusModalVisible(false)}
        overlayStyle={styles.overlay}
      >
        <Text style={styles.overlayTitle}>የእቃ ሁኔታ አዘምን</Text>
        {statusOptions.map((label, index) => (
          <Button
            key={statusValues[index]}
            title={label}
            onPress={() =>
              updateProductStatus(statusValues[index])
            }
            buttonStyle={[
              styles.statusOptionButton,
              {
                backgroundColor:
                  statusValues[index] === 'ordered'
                    ? '#e67e22'
                    : statusValues[index] === 'in_store'
                    ? '#27ae60'
                    : '#2980b9',
              },
            ]}
            containerStyle={{ marginVertical: 6 }}
            icon={
              <Icon
                name={
                  statusValues[index] === 'sold'
                    ? 'check-circle'
                    : statusValues[index] === 'in_store'
                    ? 'warehouse'
                    : 'truck'
                }
                type="font-awesome-5"
                color="#fff"
                containerStyle={{ marginRight: 8 }}
              />
            }
          />
        ))}
        <Button
          title="መሰረዝ"
          type="outline"
          onPress={() => setStatusModalVisible(false)}
          buttonStyle={styles.cancelButton}
          containerStyle={{ marginTop: 10 }}
        />
      </Overlay>
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  container: {
    flex: 1,
  },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconSpacing: {
    width: 24,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    width: '35%',
  },
  value: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    flexWrap: 'wrap',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fab: {
    backgroundColor: '#2980b9',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  editButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    paddingVertical: 12,
  },
  overlay: {
    width: '85%',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusOptionButton: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  cancelButton: {
    borderColor: '#7f8c8d',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
  },
  errorText: {
    color: '#c0392b',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2980b9',
    borderRadius: 8,
    paddingHorizontal: 20,
  },
});

export default ProductDetailScreen;
