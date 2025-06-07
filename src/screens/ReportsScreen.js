// ReportsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Button, Icon } from 'react-native-elements';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://googsites.pro.et/auth.php';
const screenWidth = Dimensions.get('window').width;

const reportsApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

axiosRetry(reportsApi, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) || axiosRetry.isIdempotentRequestError(error),
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`Reports API retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
  },
});

const ReportsScreen = () => {
  const navigation = useNavigation();
  const [timeFilter, setTimeFilter] = useState('daily');
  const [chartData, setChartData] = useState({ labels: [], datasets: [{ data: [] }] });
  const [paymentData, setPaymentData] = useState({ labels: [], datasets: [{ data: [] }] });
  const [totals, setTotals] = useState({ sales: 0, spendings: 0 });
  const [lowStock, setLowStock] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const aggregateChartData = useCallback((rawData, filterType) => {
    if (!rawData || !Array.isArray(rawData.labels) || !Array.isArray(rawData.datasets?.[0]?.data)) {
      return rawData;
    }
    const labels = rawData.labels;
    const data = rawData.datasets[0].data;
    let newLabels = [];
    let newData = [];

    if (filterType === 'daily') {
      for (let i = 0; i < labels.length; i += 4) {
        const startIdx = i;
        const endIdx = Math.min(i + 3, labels.length - 1);
        newLabels.push(`${labels[startIdx]}-${labels[endIdx]}`);
        const sumVal = data.slice(startIdx, endIdx + 1).reduce((acc, v) => acc + v, 0);
        newData.push(sumVal);
      }
    } else if (filterType === 'monthly') {
      const chunkSize = Math.ceil(labels.length / 5);
      for (let i = 0; i < labels.length; i += chunkSize) {
        const weekIndex = Math.floor(i / chunkSize) + 1;
        newLabels.push(`Wk ${weekIndex}`);
        const endIdx = Math.min(i + chunkSize - 1, labels.length - 1);
        const sumVal = data.slice(i, endIdx + 1).reduce((acc, v) => acc + v, 0);
        newData.push(sumVal);
      }
    } else {
      return rawData;
    }

    return {
      labels: newLabels,
      datasets: [{ data: newData }],
    };
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        reportsApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        delete reportsApi.defaults.headers.common['Authorization'];
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await reportsApi.get('', {
        params: { action: 'get_reports', filter: timeFilter },
      });

      if (
        response.data?.chartData &&
        response.data?.totals &&
        response.data?.paymentData &&
        response.data?.lowStock &&
        response.data?.trendingProducts
      ) {
        const aggregated = aggregateChartData(response.data.chartData, timeFilter);
        setChartData(aggregated);
        setTotals(response.data.totals);
        setPaymentData(response.data.paymentData);
        setLowStock(response.data.lowStock);
        setTrending(response.data.trendingProducts);
      } else {
        throw new Error('Received invalid data format from server.');
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      let msg = 'Could not fetch reports. Please check your internet connection.';
      if (axios.isAxiosError(err)) {
        if (err.response) {
          msg = err.response.data?.message || `Server Error: ${err.response.status}`;
          if (err.response.status === 401) {
            msg = 'Session expired. Please log in again.';
          }
        } else if (err.request) {
          msg = 'Network error: No response from server.';
        } else {
          msg = err.message;
        }
      } else {
        msg = err.message;
      }
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, aggregateChartData]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const renderFilterButton = (filter, title) => (
    <TouchableOpacity style={{ flex: 1 }} onPress={() => setTimeFilter(filter)}>
      <Text style={[styles.filterButton, timeFilter === filter && styles.activeFilter]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const pieColors = {
    cash: '#2ecc71',
    credit: '#3498db',
    account_transfer: '#f1c40f',
  };
  const pieChartData = paymentData.labels.map((method, idx) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1),
    population: paymentData.datasets[0].data[idx],
    color: pieColors[method] || '#bdc3c7',
    legendFontColor: '#333333',
    legendFontSize: 12,
  }));

  const renderLowStockItem = ({ item }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemText}>{item.name}</Text>
      <Text
        style={[
          styles.listItemQty,
          { color: item.quantity === 0 ? '#e74c3c' : '#e67e22' },
        ]}
      >
        {item.quantity} left
      </Text>
    </View>
  );
  const renderTrendingItem = ({ item }) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemText}>{item.name}</Text>
      <Text style={styles.listItemQty}>{item.sold_qty} sold</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Icon name="error-outline" type="material" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" buttonStyle={styles.retryButton} onPress={fetchReportData} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Reports</Text>

      <View style={styles.filterContainer}>
        {renderFilterButton('daily', 'Daily')}
        {renderFilterButton('weekly', 'Weekly')}
        {renderFilterButton('monthly', 'Monthly')}
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Sales and Spendings ({timeFilter})</Text>
        <BarChart
          style={{ marginVertical: 16, borderRadius: 16 }}
          data={chartData}
          width={screenWidth - 48}
          height={280}
          yAxisLabel="$"
          chartConfig={chartConfig}
          verticalLabelRotation={-45}
          fromZero={true}
          showValuesOnTopOfBars={true}
          withInnerLines={false}
        />
      </View>

      {/* Pie Chart */}
      <View style={styles.pieContainer}>
        <Text style={styles.chartTitle}>Payment Methods (%)</Text>
        <PieChart
          data={pieChartData}
          width={screenWidth - 48}
          height={240}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute={false}
          chartConfig={pieChartConfig}
          center={[0, 0]}
          hasLegend={true}
        />
      </View>

      {/* Button to Detailed Reports */}
      <View style={styles.detailButtonContainer}>
        <Button
          title="View Detailed Reports"
          onPress={() => navigation.navigate('DetailedReports')}
          buttonStyle={styles.detailButton}
          icon={{ name: 'list-alt', type: 'material', color: 'white', size: 20 }}
        />
      </View>

      {/* Low Inventory Section */}
      <View style={styles.listSection}>
        <Text style={styles.listSectionTitle}>Low Inventory (≤ 5 units)</Text>
        {lowStock.length === 0 ? (
          <Text style={styles.emptyText}>All products have sufficient stock.</Text>
        ) : (
          <FlatList
            data={lowStock}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLowStockItem}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Trending Products Section */}
      <View style={styles.listSection}>
        <Text style={styles.listSectionTitle}>Trending Products ({timeFilter})</Text>
        {trending.length === 0 ? (
          <Text style={styles.emptyText}>No sales in this timeframe.</Text>
        ) : (
          <FlatList
            data={trending}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTrendingItem}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.card}>
          <Icon name="trending-up" type="material" color="#2ecc71" size={24} />
          <Text style={styles.cardTitle}>Total Sales</Text>
          <Text style={[styles.amount, { color: '#2ecc71' }]}>
            ${totals.sales.toFixed(2)}
          </Text>
        </View>
        <View style={styles.card}>
          <Icon name="trending-down" type="material" color="#e74c3c" size={24} />
          <Text style={styles.cardTitle}>Total Spendings</Text>
          <Text style={[styles.amount, { color: '#e74c3c' }]}>
            ${totals.spendings.toFixed(2)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#f1f3f5',
  decimalPlaces: 2,
  color: () => `rgba(0, 123, 255, 1)`,
  fillShadowGradient: '#007bff',
  fillShadowGradientOpacity: 1,
  labelColor: () => `rgba(33, 37, 41, 1)`,
  style: {
    borderRadius: 16,
  },
  propsForBackgroundLines: {
    stroke: '#e9ecef',
  },
  barPercentage: 0.6,
  propsForLabels: {
    fontSize: '12',
    fontWeight: '600',
  },
};

const pieChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: () => `rgba(0, 0, 0, 1)`,
  labelColor: () => `rgba(0, 0, 0, 1)`,
  style: {
    borderRadius: 16,
  },
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    textAlign: 'center',
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 15,
  },
  activeFilter: {
    backgroundColor: '#007bff',
    color: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 32,
  },
  pieContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 24,
  },
  detailButtonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#343a40',
    textTransform: 'capitalize',
  },
  listSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  listSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2d3436',
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  listItemText: {
    fontSize: 15,
    color: '#343a40',
  },
  listItemQty: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
    marginTop: 8,
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
});

export default ReportsScreen;
