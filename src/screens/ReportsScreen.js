import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit'; // Ensure BarChart is imported
import { authApi } from '../api/authApi';

const ReportsScreen = () => {
  const [timeframe, setTimeframe] = useState('daily');
  const [salesData, setSalesData] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState({ spending: [], sales: [] });
  const [dailySalesChartData, setDailySalesChartData] = useState(null); // NEW state for daily sales chart

  useEffect(() => {
    loadReportData();
  }, [timeframe]);

  const loadReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authApi.getReports(timeframe);
      
      setSalesData({
        total: data.sales?.total || 0,
        hourlyData: data.sales?.hourlyData || [],
        paymentMethods: data.sales?.paymentMethods || []
      });
      
      setSpendingData({
        total: data.spending?.total || 0,
        categories: data.spending?.categories || []
      });

      setTransactions({
        spending: data.transactions?.spending || [],
        sales: data.transactions?.sales || []
      });

      setDailySalesChartData(data.sales?.dailySalesChartData || []); // Set NEW daily sales chart data
      
    } catch (err) {
      setError(err.message || 'Failed to fetch reports.');
      console.error('Error fetching reports:', err);
      // Reset data on error to prevent displaying stale info
      setSalesData(null);
      setSpendingData(null);
      setTransactions({ spending: [], sales: [] });
      setDailySalesChartData(null); 
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button title="Retry" onPress={loadReportData} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timeframeButtons}>
        <Button
          title="Daily"
          onPress={() => setTimeframe('daily')}
          buttonStyle={timeframe === 'daily' ? styles.activeButton : styles.button}
          titleStyle={styles.buttonText}
        />
        <Button
          title="Weekly"
          onPress={() => setTimeframe('weekly')}
          buttonStyle={timeframe === 'weekly' ? styles.activeButton : styles.button}
          titleStyle={styles.buttonText}
        />
        <Button
          title="Monthly"
          onPress={() => setTimeframe('monthly')}
          buttonStyle={timeframe === 'monthly' ? styles.activeButton : styles.button}
          titleStyle={styles.buttonText}
        />
        <Button
          title="Annual"
          onPress={() => setTimeframe('annual')}
          buttonStyle={timeframe === 'annual' ? styles.activeButton : styles.button}
          titleStyle={styles.buttonText}
        />
      </View>

      {salesData && (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionHeader}>Sales Overview</Text>
          <Divider style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sales:</Text>
            <Text style={styles.summaryValue}>${salesData.total?.toFixed(2)}</Text>
          </View>

          {/* Sales by Hour (Line Chart) */}
          <Text style={styles.subHeader}>Sales by Hour</Text>
          {salesData.hourlyData && salesData.hourlyData.length > 0 ? (
            <LineChart
              data={{
                labels: salesData.hourlyData.map(item => `${item.hour}:00`),
                datasets: [
                  {
                    data: salesData.hourlyData.map(item => item.amount)
                  }
                ]
              }}
              width={Dimensions.get('window').width - 60}
              height={220}
              yAxisLabel="$"
              chartConfig={chartConfig}
              bezier
              style={styles.chartStyle}
            />
          ) : (
            <Text style={styles.noDataText}>No hourly sales data available for this timeframe.</Text>
          )}

          {/* NEW: Sales by Day (Bar Chart) */}
          <Text style={styles.subHeader}>Sales by Day of Week</Text>
          {dailySalesChartData && dailySalesChartData.length > 0 ? (
            <BarChart
              data={{
                labels: dailySalesChartData.map(item => item.day.substring(0, 3)), // Mon, Tue, etc.
                datasets: [{
                  data: dailySalesChartData.map(item => item.amount)
                }]
              }}
              width={Dimensions.get('window').width - 60}
              height={220}
              yAxisLabel="$"
              chartConfig={chartConfig} // Using the same chartConfig
              style={styles.chartStyle}
            />
          ) : (
            <Text style={styles.noDataText}>No daily sales data available for this timeframe.</Text>
          )}

          {/* Payment Methods */}
          <Text style={styles.subHeader}>Sales by Payment Method</Text>
          {salesData.paymentMethods && salesData.paymentMethods.length > 0 && salesData.paymentMethods.some(pm => pm.amount > 0) ? (
            <PieChart
              data={salesData.paymentMethods.filter(pm => pm.amount > 0).map((item, index) => ({
                name: item.method,
                population: item.amount,
                color: ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22'][index % 5], // Example colors
                legendFontColor: '#7F7F7F',
                legendFontSize: 15
              }))}
              width={Dimensions.get('window').width - 60}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={styles.noDataText}>No payment method data available for this timeframe.</Text>
          )}
        </Card>
      )}

      {spendingData && (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionHeader}>Spending Overview</Text>
          <Divider style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Spending:</Text>
            <Text style={styles.summaryValue}>-${spendingData.total?.toFixed(2)}</Text>
          </View>

          {/* Spending by Category (Bar Chart) */}
          <Text style={styles.subHeader}>Spending by Category</Text>
          {spendingData.categories && spendingData.categories.length > 0 && spendingData.categories.some(cat => cat.amount > 0) ? (
            <BarChart
              data={{
                labels: spendingData.categories.map(item => item.name),
                datasets: [
                  {
                    data: spendingData.categories.map(item => item.amount)
                  }
                ]
              }}
              width={Dimensions.get('window').width - 60}
              height={220}
              yAxisLabel="$"
              chartConfig={chartConfig}
              style={styles.chartStyle}
            />
          ) : (
            <Text style={styles.noDataText}>No spending data available for this timeframe.</Text>
          )}
        </Card>
      )}

      {salesData && spendingData && (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionHeader}>Net Income</Text>
          <Divider style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Income:</Text>
            <Text style={[styles.summaryValue, salesData.total - spendingData.total >= 0 ? styles.positiveIncome : styles.negativeIncome]}>
              ${(salesData.total - spendingData.total)?.toFixed(2)}
            </Text>
          </View>
        </Card>
      )}

      {transactions.spending.length > 0 || transactions.sales.length > 0 ? (
        <Card containerStyle={styles.card}>
          <Text style={styles.sectionHeader}>Recent Transactions</Text>
          <Divider style={styles.divider} />
          {transactions.sales.length > 0 && (
            <View>
              <Text style={styles.subHeader}>Sales Transactions</Text>
              {transactions.sales.map((item, index) => (
                <View key={`sale-${index}`} style={styles.transactionItem}>
                  <Text style={styles.transactionDate}>
                    {new Date(item.transaction_date).toLocaleString()}
                  </Text>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionCategory}>{item.product_name}</Text>
                    <Text style={styles.transactionReason}>Qty: {item.quantity}, Method: {item.payment_method}</Text>
                    {item.comment ? <Text style={styles.transactionComment}>{item.comment}</Text> : null}
                  </View>
                  <Text style={styles.transactionAmountGreen}>+${item.amount.toFixed(2)}</Text>
                </View>
              ))}
              <Divider style={styles.smallDivider} />
            </View>
          )}

          {transactions.spending.length > 0 && (
            <View>
              <Text style={styles.subHeader}>Spending Transactions</Text>
              {transactions.spending.map((item, index) => (
                <View key={`spending-${index}`} style={styles.transactionItem}>
                  <Text style={styles.transactionDate}>
                    {new Date(item.transaction_date).toLocaleString()}
                  </Text>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionCategory}>{item.category}</Text>
                    <Text style={styles.transactionReason}>{item.reason}</Text>
                    {item.comment ? <Text style={styles.transactionComment}>{item.comment}</Text> : null}
                  </View>
                  <Text style={styles.transactionAmountRed}>-${item.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ) : (
        <Card containerStyle={styles.card}>
          <Text style={styles.noDataText}>No transactions available for this timeframe.</Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeframeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#ccc',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  activeButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
  },
  card: {
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#555',
  },
  divider: {
    marginVertical: 10,
    backgroundColor: '#e0e0e0',
  },
  smallDivider: {
    marginVertical: 5,
    backgroundColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveIncome: {
    color: '#2ecc71',
  },
  negativeIncome: {
    color: '#e74c3c',
  },
  noDataText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#7f8c8d',
    paddingVertical: 20,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionDetails: {
    flex: 1,
    paddingHorizontal: 10,
  },
  transactionDate: {
    fontSize: 11,
    color: '#7f8c8d',
    minWidth: 80,
    textAlign: 'left',
  },
  transactionCategory: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#34495e',
  },
  transactionReason: {
    color: '#555',
    fontSize: 13,
    marginTop: 2,
  },
  transactionComment: {
    fontStyle: 'italic',
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmountRed: {
    color: '#e74c3c',
    fontWeight: 'bold',
    minWidth: 70,
    textAlign: 'right',
    fontSize: 14,
  },
  transactionAmountGreen: {
    color: '#2ecc71',
    fontWeight: 'bold',
    minWidth: 70,
    textAlign: 'right',
    fontSize: 14,
  },
});

export default ReportsScreen;