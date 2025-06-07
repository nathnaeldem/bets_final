import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  SectionList,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon, ListItem } from 'react-native-elements';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart } from 'react-native-chart-kit';
// ——— Make sure to install and link this package properly ———
//   npm install react-native-html-to-pdf
//   # then (iOS only) cd ios && pod install
//   # then rebuild the app: npx react-native run-ios / run-android
import RNHTMLtoPDF from 'react-native-html-to-pdf';

const API_URL = 'https://googsites.pro.et/auth.php';
const screenWidth = Dimensions.get('window').width;

// Create an axios instance with retry logic
const transactionsApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});
axiosRetry(transactionsApi, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) ||
    axiosRetry.isIdempotentRequestError(error),
  onRetry: (retryCount, error, requestConfig) => {
    console.log(
      `Transactions API retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`
    );
  },
});

const DetailedReportsScreen = () => {
  // ── State ────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [timeframe, setTimeframe] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [productTxs, setProductTxs] = useState([]);
  const [spendingTxs, setSpendingTxs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatDateTime = (d, endOfDay = false) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = endOfDay ? '23' : '00';
    const mi = endOfDay ? '59' : '00';
    const ss = endOfDay ? '59' : '00';
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  // Build PieChart data (only cash/credit/account_transfer)  
  const computeChartData = () => {
    const counts = { cash: 0, credit: 0, account_transfer: 0 };
    productTxs.forEach((tx) => {
      const pm = tx.payment_method;
      if (pm in counts) counts[pm]++;
    });

    const raw = [
      {
        name: 'Cash',
        count: counts.cash,
        color: '#4caf50',
        legendFontColor: '#343a40',
        legendFontSize: 14,
      },
      {
        name: 'Credit',
        count: counts.credit,
        color: '#2196f3',
        legendFontColor: '#343a40',
        legendFontSize: 14,
      },
      {
        name: 'Acc Transfer',
        count: counts.account_transfer,
        color: '#ff9800',
        legendFontColor: '#343a40',
        legendFontSize: 14,
      },
    ];
    return raw.filter((slice) => slice.count > 0);
  };

  // Build an HTML string used to generate the PDF
  const buildHTMLforPDF = () => {
    const isoDate = selectedDate.toISOString().slice(0, 10);
    let html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 20px; margin-top: 24px; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            ul { margin-left: 20px; }
          </style>
        </head>
        <body>
          <h1>Report for ${isoDate} (${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)})</h1>
    `;

    // Payment‐Method Breakdown (as a simple bullet list)
    html += `<h2>Payment‐Method Breakdown</h2>`;
    const chartData = computeChartData();
    if (chartData.length === 0) {
      html += `<p>No product sales on this date.</p>`;
    } else {
      html += `<ul>`;
      chartData.forEach((slice) => {
        html += `<li><strong>${slice.name}:</strong> ${slice.count}</li>`;
      });
      html += `</ul>`;
    }

    // Product Transactions table
    html += `<h2>Product Transactions</h2>`;
    if (productTxs.length === 0) {
      html += `<p>No product sales on this date.</p>`;
    } else {
      html += `
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
      `;
      productTxs.forEach((item) => {
        const price = parseFloat(item.Sold_Price) || 0;
        const qty = parseInt(item.quantity_sold || item.quantity || '0', 10);
        const total = price * qty;
        const time = item.transaction_date.slice(11, 19);

        html += `
          <tr>
            <td>${item.product_name}</td>
            <td>${qty}</td>
            <td>$${price.toFixed(2)}</td>
            <td>$${total.toFixed(2)}</td>
            <td>${item.payment_method}</td>
            <td>${time}</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    }

    // Spending Transactions table
    html += `<h2>Spending Transactions</h2>`;
    if (spendingTxs.length === 0) {
      html += `<p>No spending transactions on this date.</p>`;
    } else {
      html += `
        <table>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Description</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
      `;
      spendingTxs.forEach((item) => {
        const amt = parseFloat(item.amount) || 0;
        const desc = item.description || 'No description';
        const time = item.transaction_date.slice(11, 19);
        html += `
          <tr>
            <td>$${amt.toFixed(2)}</td>
            <td>${desc}</td>
            <td>${time}</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    }

    html += `</body></html>`;
    return html;
  };

  // Generate PDF and show an alert with the saved file path
  const generatePDF = async () => {
    if (productTxs.length === 0 && spendingTxs.length === 0) {
      Alert.alert('Nothing to Print', 'There is no data for this date/timeframe.');
      return;
    }

    try {
      const htmlString = buildHTMLforPDF();
      const isoDate = selectedDate.toISOString().slice(0, 10);
      const fileName = `report_${isoDate}_${timeframe}`;
      const options = {
        html: htmlString,
        fileName,
        directory: 'Documents', // Saves under Documents/
      };
      const file = await RNHTMLtoPDF.convert(options);
      Alert.alert('PDF Generated', `Saved to:\n${file.filePath}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      Alert.alert('PDF Error', 'Could not generate PDF. Ensure that react-native-html-to-pdf is linked and rebuilt.');
    }
  };

  // ── Fetch Data ────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        transactionsApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        delete transactionsApi.defaults.headers.common['Authorization'];
        throw new Error('Authentication token not found. Please log in again.');
      }

      const start = formatDateTime(selectedDate, false);
      const end = formatDateTime(selectedDate, true);

      const response = await transactionsApi.get('', {
        params: {
          action: 'get_reports',
          filter: timeframe,
          start,
          end,
        },
      });

      if (
        response.data?.productTransactions &&
        response.data?.spendingTransactions
      ) {
        setProductTxs(response.data.productTransactions);
        setSpendingTxs(response.data.spendingTransactions);
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      let msg = 'Could not fetch transactions. Please try again.';
      if (axios.isAxiosError(err)) {
        if (err.response) {
          msg =
            err.response.data?.message || `Server Error: ${err.response.status}`;
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
  }, [selectedDate, timeframe]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── Handlers & Renderers ─────────────────────────────────────────────
  const onChangeDate = (event, date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const renderProductItem = ({ item }) => {
    const price = parseFloat(item.Sold_Price) || 0;
    const qty = parseInt(item.quantity_sold || item.quantity || '0', 10);
    const total = price * qty;
    const time = item.transaction_date.slice(11, 19);

    return (
      <ListItem bottomDivider containerStyle={styles.listItem}>
        <Icon name="box" type="material-community" color="#3498db" />
        <ListItem.Content>
          <ListItem.Title style={styles.listTitle}>
            {item.product_name}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.listSubtitle}>
            Qty: {qty} × ${price.toFixed(2)} = ${total.toFixed(2)}
          </ListItem.Subtitle>
        </ListItem.Content>
        <View style={styles.trailingContainer}>
          <Text style={styles.txDate}>{time}</Text>
          <Text style={styles.smallText}>{item.payment_method}</Text>
        </View>
      </ListItem>
    );
  };

  const renderSpendingItem = ({ item }) => {
    const amt = parseFloat(item.amount) || 0;
    const desc = item.description || 'No description';
    const time = item.transaction_date.slice(11, 19);

    return (
      <ListItem bottomDivider containerStyle={styles.listItem}>
        <Icon name="money-off" type="material" color="#e74c3c" />
        <ListItem.Content>
          <ListItem.Title style={styles.listTitle}>
            ${amt.toFixed(2)}
          </ListItem.Title>
          <ListItem.Subtitle style={styles.listSubtitle}>
            {desc}
          </ListItem.Subtitle>
        </ListItem.Content>
        <View style={styles.trailingContainer}>
          <Text style={styles.txDate}>{time}</Text>
        </View>
      </ListItem>
    );
  };

  // ── Main JSX ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ─── Filter Bar + Print Button ─────────────────────────────── */}
      <View style={styles.headerBar}>
        <View style={styles.filterBar}>
          {['daily', 'weekly', 'monthly'].map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.filterButton,
                timeframe === tf ? styles.filterButtonActive : null,
              ]}
              onPress={() => setTimeframe(tf)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeframe === tf ? styles.filterButtonTextActive : null,
                ]}
              >
                {tf.charAt(0).toUpperCase() + tf.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.printButton} onPress={generatePDF}>
          <Icon name="print" type="material" color="white" size={20} />
          <Text style={styles.printButtonText}>Print</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Date Picker Header ────────────────────────────────────── */}
      <View style={styles.datePickerContainer}>
        <Text style={styles.headerText}>
          Transactions on: {selectedDate.toISOString().slice(0, 10)}
        </Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker(true)}
        >
          <Icon name="calendar-today" type="material" color="white" />
          <Text style={styles.dateButtonText}>Change Date</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

      {/* ─── Loading / Error ────────────────────────────────────────── */}
      {loading && (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}
      {error && !loading && (
        <View style={styles.centeredContainer}>
          <Icon 
            name="error-outline" 
            type="material" 
            size={50} 
            color="#e74c3c" 
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchTransactions}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── SectionList: PieChart in ListHeaderComponent + Two Sections ─── */}
      {!loading && !error && (
        <SectionList
          // Provide a ListHeaderComponent for the PieChart (renders once)
          ListHeaderComponent={() => {
            const chartData = computeChartData();
            return (
              <View>
                <Text style={styles.sectionTitle}>Payment Method Breakdown</Text>
                {chartData.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No product sales on this date.
                  </Text>
                ) : (
                  <PieChart
                    data={chartData}
                    width={screenWidth * 0.9}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      color: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0,0,0, ${opacity})`,
                    }}
                    accessor="count"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                )}
              </View>
            );
          }}
          // Only two sections now: products and spending
          sections={[
            { title: 'Product Transactions', data: productTxs },
            { title: 'Spending Transactions', data: spendingTxs },
          ]}
          keyExtractor={(item, index) => {
            // Use item.id if available; else fallback to index
            return item.id ? item.id.toString() : `${index}`;
          }}
          renderItem={({ item, section }) => {
            if (section.title === 'Product Transactions') {
              return renderProductItem({ item });
            } else {
              return renderSpendingItem({ item });
            }
          }}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  // Header row: filter buttons + Print
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterBar: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#343a40',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  printButton: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  printButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Date Picker header
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
  },
  dateButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dateButtonText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },

  // Loading / Error
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  // Section headers (Title texts)
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
    marginVertical: 12,
    alignSelf: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginVertical: 8,
  },

  // List item styling
  listItem: {
    backgroundColor: 'white',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  trailingContainer: {
    alignItems: 'flex-end',
  },
  txDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#343a40',
  },
  smallText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
});
export default DetailedReportsScreen;
