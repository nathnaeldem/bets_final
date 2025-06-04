import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// App Screens (add your main app screens here)
import HomeScreen from '../screens/HomeScreen';

// Add these imports
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import AddProductScreen from '../screens/AddProductScreen';
// Add import
import EditProductScreen from '../screens/EditProductScreen';
import SalesScreen from '../screens/SalesScreen';
// Add this import at the top
import SpendingScreen from '../screens/SpendingScreen';
// Add this import
// Add this import
import ReportsScreen from '../screens/ReportsScreen';

const Stack = createStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

// Update the AppStack to include product screens
const AppStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Add New Product' }} />
      <Stack.Screen name="EditProduct" component={EditProductScreen} options={{ title: 'Edit Product' }} />
      <Stack.Screen name="Sales" component={SalesScreen} options={{ title: 'Product Sales' }} />
      <Stack.Screen name="Spending" component={SpendingScreen} options={{ title: 'Record Spending' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Analytics Dashboard' }} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You can create a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;