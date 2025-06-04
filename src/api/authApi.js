import axios from 'axios';

// Replace with your actual API base URL
const API_URL = 'your_url_to_api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add defaults to authApi
const authApi = {
  defaults: api.defaults,
  addSpending: async (spendingData) => {
    try {
      const response = await api.post('', spendingData, {
        params: { action: 'add_spending' }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
        'Failed to record spending. Please try again.'
      );
    }
  },
  login: async (username, password) => {
    try {
      const response = await api.post('', { 
        username, 
        password 
      }, {
        params: { action: 'login' }
      });
      
      return {
        user: response.data.user,
        token: response.data.token,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Login failed. Please try again.'
      );
    }
  },
  
  register: async (userData) => {
    try {
      const response = await api.post('', userData, {
        params: { action: 'register' }
      });
      return {
        message: response.data.message
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        'Registration failed. Please try again.'
      );
    }
  },
  
  resetPassword: async (email) => {
    try {
      const response = await api.post('', { email }, {
        params: { action: 'reset' }
      });
      return {
        message: response.data.message
      };
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        'Password reset failed. Please try again.'
      );
    }
  },
  
  // Add these new product management functions
  getProducts: async () => {
    try {
      const response = await api.post('', {}, {
        params: { action: 'getProducts' }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to fetch products. Please try again.'
      );
    }
  },
  
  getProductDetails: async (productId) => {
    try {
      const response = await api.post('', {}, {
        params: { action: 'getProductDetails', productId }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to fetch product details. Please try again.'
      );
    }
  },
  
  addProduct: async (productData) => {
    try {
      const response = await api.post('', productData, {
        params: { action: 'addProduct' }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to add product. Please try again.'
      );
    }
  },
  
  updateProductStatus: async (productId, status, quantity) => {
    try {
      const response = await api.post('', {
        product_id: productId,
        new_status: status,
        quantity: quantity
      }, {
        params: { action: 'updateProductStatus' }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to update product status. Please try again.'
      );
    }
  },

  updateProduct: async (productData) => {
    try {
      const response = await api.post('', productData, {
        params: { action: 'updateProduct' }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
        'Failed to update product. Please try again.'
      );
    }
  },

  sellProduct: async (saleData) => {
    try {
      const response = await api.post('', saleData, {
        params: { action: 'sellProduct' }
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
        'Failed to process sale. Please try again.'
      );
    }
  },

  getReports: async (timeframe) => {
    console.log('getReports called with timeframe:', timeframe);
    try {
      const response = await api.post('', { timeframe }, {
        params: { action: 'get_reports' }
      });
      console.log('getReports response:', response.data);
      return response.data;
    } catch (error) {
      console.error('getReports error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message ||
        'Failed to load reports. Please try again.'
      );
    }
  },
};

export { authApi };
export default api;