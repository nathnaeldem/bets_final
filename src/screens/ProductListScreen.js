import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Icon } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import api from '../api/authApi';

const ProductListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.post('', {}, { params: { action: 'getProducts' } });
      setProducts(response.data.products || []);
    } catch (err) {
      console.error(err);
      setError('መረጃዎችን መመጣጠን አልተቻለም');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const unsubscribe = navigation.addListener('focus', fetchProducts);
    return unsubscribe;
  }, [navigation]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ordered': return '#f1c40f';    
      case 'in_store': return '#2ecc71';   
      case 'sold': return '#3498db';       
      default: return '#7f8c8d';           
    }
  };

  const renderItem = ({ item }) => (
    <Card containerStyle={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Card.Divider style={styles.divider} />
      
      <View style={styles.detailsContainer}>
        <DetailRow label="ብዛት፡" value={item.quantity} />
        <DetailRow label="የግብይት ዋጋ፡" value={`$${item.import_price}`} />
        <DetailRow label="የሽያጭ ዋጋ፡" value={`$${item.selling_price}`} />
      </View>

      <Button
        title="ዝርዝር አሳይ"
        icon={<Icon name="chevron-right" type="material" size={20} color="white" />}
        buttonStyle={styles.detailButton}
        titleStyle={styles.buttonText}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      />
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0984e3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={40} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="እንደገና ይሞክሩ"
          buttonStyle={styles.retryButton}
          titleStyle={styles.buttonText}
          onPress={fetchProducts}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>የእቃ መዝገብ</Text>
        {user?.role === 'admin' && (
          <Button
            icon={<Icon name="add" size={22} color="white" />}
            title=" አዲስ እቃ ጨምር"
            buttonStyle={styles.addButton}
            titleStyle={styles.buttonText}
            onPress={() => navigation.navigate('AddProduct')}
          />
        )}
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2d3436',
   
    
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    backgroundColor: '#dfe6e9',
    marginVertical: 8,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2d3436',
    fontWeight: '600',
  },
  detailButton: {
    backgroundColor: '#0984e3',
    borderRadius: 12,
    height: 48,
  },
  addButton: {
    backgroundColor: '#00b894',
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 48,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0984e3',
    borderRadius: 12,
    width: 200,
    height: 48,
  },
  listContainer: {
    paddingBottom: 30,
  },
});

export default ProductListScreen;
