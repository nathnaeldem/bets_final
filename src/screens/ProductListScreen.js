import React, { useState, useEffect, useCallback } from 'react'; 
import { 
  View, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TextInput,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native'; 
import { Button, Card, Icon } from 'react-native-elements'; 
import { useAuth } from '../context/AuthContext'; 
import axios from 'axios'; 
import axiosRetry from 'axios-retry'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const API_URL = 'https://dankula.x10.mx/auth.php'; 

const productsApi = axios.create({ 
  baseURL: API_URL, 
  headers: { 
    'Content-Type': 'application/json', 
  }, 
  timeout: 15000, 
}); 

axiosRetry(productsApi, { 
  retries: 3, 
  retryDelay: (retryCount) => { 
    return retryCount * 1000; 
  }, 
  retryCondition: (error) => { 
    return axiosRetry.isNetworkError(error) || axiosRetry.isIdempotentRequestError(error); 
  }, 
  onRetry: (retryCount, error, requestConfig) => { 
    console.log(`Product list API retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`); 
  }, 
}); 

const ProductListScreen = ({ navigation }) => { 
  const { user } = useAuth(); 
  const [products, setProducts] = useState([]); 
  const [filteredProducts, setFilteredProducts] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [categories, setCategories] = useState([]); 
  const [selectedCategory, setSelectedCategory] = useState('ሁሉም'); 

  const fetchProducts = useCallback(async () => { 
    setLoading(true); 
    setError(null); 
    try { 
      const token = await AsyncStorage.getItem('token'); 
      if (token) { 
        productsApi.defaults.headers.common['Authorization'] = `Bearer ${token}`; 
      } else { 
        delete productsApi.defaults.headers.common['Authorization']; 
      } 

      const response = await productsApi.post( 
        '', 
        {}, 
        { 
          params: { action: 'getProducts' }, 
        } 
      ); 

      const fetchedData = response.data.products || []; 
      setProducts(fetchedData); 
      
      // Extract unique categories
      const uniqueCategories = ['ሁሉም', ...new Set(fetchedData.map(p => p.category))];
      setCategories(uniqueCategories);
      
      applyFilters(fetchedData, searchQuery, selectedCategory);
    } catch (err) { 
      console.error('Error fetching products:', err); 
      let errorMessage = 'ምርቶችን ማግኘት አልተቻለም። እባክዎ የኢንተርኔት ግንኙነትዎን ያረጋግጡ።'; 

      if (axios.isAxiosError(err)) { 
        if (err.response) { 
          errorMessage = err.response.data?.message || `የሰርቨር ስህተት: ${err.response.status}`; 
          if (err.response.status === 401) { 
            errorMessage = 'የስራ ልውውጥ ጊዜው አልቋል። እባክዎ እንደገና ይግቡ።'; 
          } 
        } else if (err.request) { 
          errorMessage = 'የኔትዎርክ ስህተት፡ ከሰርቨር ምላሽ አልተሰጠም። የኢንተርኔት ግንኙነትዎን ያረጋግጡ።'; 
        } else { 
          errorMessage = err.message || 'ያልታወቀ ስህተት ተፈጥሯል።'; 
        } 
      } 
      setError(errorMessage); 
      Alert.alert('ስህተት', errorMessage); 
    } finally { 
      setLoading(false); 
    } 
  }, [searchQuery, selectedCategory]); 

  const applyFilters = (data, query, category) => {
    let filtered = [...data];
    
    // Apply category filter
    if (category !== 'ሁሉም') {
      filtered = filtered.filter(product => product.category === category);
    }
    
    // Apply search query
    if (query) { 
      const lowerCaseQuery = query.toLowerCase(); 
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(lowerCaseQuery) || 
        product.status.toLowerCase().includes(lowerCaseQuery) || 
        product.quantity.toString().includes(lowerCaseQuery) || 
        product.import_price.toString().includes(lowerCaseQuery) || 
        product.selling_price.toString().includes(lowerCaseQuery) ||
        (product.category && product.category.toLowerCase().includes(lowerCaseQuery))
      ); 
    }
    
    setFilteredProducts(filtered);
  };

  useEffect(() => { 
    fetchProducts(); 
    const unsubscribe = navigation.addListener('focus', fetchProducts); 
    return unsubscribe; 
  }, [navigation, fetchProducts]); 

  const handleSearch = (text) => { 
    setSearchQuery(text); 
    applyFilters(products, text, selectedCategory);
  }; 

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    applyFilters(products, searchQuery, category);
  };

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
        <DetailRow label="የግብይት ዋጋ፡" value={`ETB${item.import_price}`} /> 
        <DetailRow label="የሽያጭ ዋጋ፡" value={`ETB${item.selling_price}`} /> 
        <DetailRow label="ምድብ፡" value={item.category} /> 
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

  if (loading && products.length === 0) { 
    return ( 
      <View style={styles.loadingContainer}> 
        <ActivityIndicator size="large" color="#0984e3" /> 
      </View> 
    ); 
  } 

  if (error && products.length === 0) { 
    return ( 
      <View style={styles.errorContainer}> 
        <Icon name="wifi-off" type="material-community" size={50} color="#e74c3c" /> 
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
            title=" አዲስ እቃ መዝግብ" 
            buttonStyle={styles.addButton} 
            titleStyle={styles.buttonText} 
            onPress={() => navigation.navigate('AddProduct')} 
          /> 
        )} 
      </View> 

      {/* Horizontal Category Filter */}
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>ምድቦችን ያጣሩ</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollView}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.selectedCategoryPill
              ]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.searchContainer}> 
        <TextInput 
          style={styles.searchInput} 
          placeholder="ምርቶችን ይፈልጉ..." 
          placeholderTextColor="#95a5a6" 
          onChangeText={handleSearch} 
          value={searchQuery} 
        /> 
        {searchQuery.length > 0 && ( 
          <Icon 
            name="close" 
            size={24} 
            color="#95a5a6" 
            containerStyle={styles.clearIcon} 
            onPress={() => { 
              setSearchQuery(''); 
              applyFilters(products, '', selectedCategory);
            }} 
          /> 
        )} 
      </View> 

      <FlatList 
        data={filteredProducts} 
        keyExtractor={(item) => item.id.toString()} 
        renderItem={renderItem} 
        contentContainerStyle={styles.listContainer} 
        showsVerticalScrollIndicator={false} 
        ListEmptyComponent={() => ( 
          !loading && !error && filteredProducts.length === 0 && ( 
            <View style={styles.emptyListContainer}> 
              <Icon name="info" type="material" size={40} color="#7f8c8d" /> 
              <Text style={styles.emptyListText}>ምንም ምርቶች አልተገኙም።</Text> 
            </View> 
          ) 
        )} 
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
    marginBottom: 10, 
    marginTop: 10, 
  }, 
  screenTitle: { 
    fontSize: 24, 
    fontWeight: '600', 
    color: '#2d3436', 
  }, 
  categoryContainer: {
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#636e72',
    marginBottom: 8,
  },
  categoryScrollView: {
    paddingBottom: 5,
  },
  categoryPill: {
    backgroundColor: '#ecf0f1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  selectedCategoryPill: {
    backgroundColor: '#0984e3',
    borderColor: '#0984e3',
  },
  categoryText: {
    fontSize: 14,
    color: '#2d3436',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    backgroundColor: '#ffffff', 
    borderRadius: 12, 
    height: 48, 
    paddingHorizontal: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 2, 
  }, 
  searchInput: { 
    flex: 1, 
    color: '#2d3436', 
    fontSize: 16, 
    height: '100%', 
  }, 
  clearIcon: { 
    padding: 5, 
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
    backgroundColor: '#5C4033', 
    borderRadius: 12, 
    width: 200, 
    height: 48, 
  }, 
  listContainer: { 
    paddingBottom: 30, 
  }, 
  emptyListContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 50, 
  }, 
  emptyListText: { 
    fontSize: 16, 
    color: '#7f8c8d', 
    marginTop: 10, 
    textAlign: 'center', 
  }, 
}); 

export default ProductListScreen;