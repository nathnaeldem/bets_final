import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon, ListItem } from 'react-native-elements';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart } from 'react-native-chart-kit';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

const API_URL = 'https://dankula.x10.mx/auth.php';
const screenWidth = Dimensions.get('window').width;

const EthiopianCalendar = {
  months: [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ],

  ETHIOPIC_EPOCH: 1723856,

  gregorianToEthiopian(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const a = Math.floor((14 - m) / 12);
    const yʹ = y + 4800 - a;
    const mʹ = m + 12 * a - 3;
    const jd = d
      + Math.floor((153 * mʹ + 2) / 5)
      + 365 * yʹ
      + Math.floor(yʹ / 4)
      - Math.floor(yʹ / 100)
      + Math.floor(yʹ / 400)
      - 32045;

    const r = jd - EthiopianCalendar.ETHIOPIC_EPOCH;
    const cycle = Math.floor(r / 1461);
    const rem = r % 1461;
    const yearInCycle = Math.floor(rem / 365);
    const year = cycle * 4 + yearInCycle ;
    const dayOfYear = rem % 365;
    const month = Math.floor(dayOfYear / 30) + 1;
    const day = (dayOfYear % 30) + 1;

    return { year, month, day };
  },

  ethiopianToGregorian(ethYear, ethMonth, ethDay) {
    const yd = (ethYear - 1) * 365 + Math.floor((ethYear - 1) / 4);
    const md = (ethMonth - 1) * 30;
    const jd = EthiopianCalendar.ETHIOPIC_EPOCH + yd + md + (ethDay - 1);

    let a = jd + 32044;
    let b = Math.floor((4 * a + 3) / 146097);
    let c = a - Math.floor((146097 * b) / 4);
    let d = Math.floor((4 * c + 3) / 1461);
    let e = c - Math.floor((1461 * d) / 4);
    let m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);

    return new Date(year, month - 1, day);
  },

  formatEthiopianDate(ethYear, ethMonth, ethDay) {
    const monthName = EthiopianCalendar.months[ethMonth - 1];
    return `${ethDay} ${monthName} ${ethYear}`;
  },
  getCurrentEthiopianDate() {
    return EthiopianCalendar.gregorianToEthiopian(new Date());
  }
};

const transactionsApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

axiosRetry(transactionsApi, {
  retries: 3,
  retryDelay: (count) => count * 1000,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) ||
    axiosRetry.isIdempotentRequestError(error),
  onRetry: (count, error, cfg) => {
    console.log(`Retry ${count} for ${cfg.url}: ${error.message}`);
  },
});

const DetailedReportsScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isEthiopianCalendar, setIsEthiopianCalendar] = useState(false);
  const [timeframe, setTimeframe] = useState('daily');
  const [productTxs, setProductTxs] = useState([]);
  const [spendingTxs, setSpendingTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDateTime = (d, endOfDay = false) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = endOfDay ? '23' : '00';
    const mi = endOfDay ? '59' : '00';
    const ss = endOfDay ? '59' : '00';
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };

  const getDisplayDate = () => {
    if (isEthiopianCalendar) {
      const { year, month, day } = EthiopianCalendar.gregorianToEthiopian(selectedDate);
      return EthiopianCalendar.formatEthiopianDate(year, month, day);
    }
    return selectedDate.toISOString().slice(0, 10);
  };

  const toggleCalendar = () => setIsEthiopianCalendar((f) => !f);

  const computeChartData = () => {
    const counts = { cash: 0, credit: 0, account_transfer: 0 };
    productTxs.forEach((tx) => {
      if (tx.payment_method in counts) counts[tx.payment_method]++;
    });
    return [
      { name: 'Cash', count: counts.cash, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 14 },
      { name: 'Credit', count: counts.credit, color: '#2196F3', legendFontColor: '#333', legendFontSize: 14 },
      { name: 'Acc Transfer', count: counts.account_transfer, color: '#FF9800', legendFontColor: '#333', legendFontSize: 14 },
    ].filter((s) => s.count > 0);
  };

  const formatTime12Hour = (time24) => {
    // Expecting format like "14:30:45"
    if (!time24 || time24.length < 5) return time24;
    
    const [hours24, minutes, seconds] = time24.split(':');
    const hours = parseInt(hours24, 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${hours12}:${minutes}${seconds ? `:${seconds}` : ''} ${period}`;
  };

  const buildHTMLforPDF = () => {
    const displayDate = getDisplayDate();
    const calendarType = isEthiopianCalendar ? 'Ethiopian' : 'Gregorian';
    let html = `
      <html><head><meta charset="UTF-8"/><style>
        body{font-family:Arial;padding:24px;}
        h1{font-size:24px;margin-bottom:8px;}
        h2{font-size:20px;margin-top:24px;margin-bottom:4px;}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;}
        th,td{border:1px solid #999;padding:8px;text-align:left;}
        th{background:#f0f0f0;}
        ul{margin-left:20px;}
        .calendar-info{font-size:14px;color:#666;margin-bottom:16px;}
      </style></head><body>
      <h1>Report for ${displayDate}</h1>
      <div class="calendar-info">
        Calendar: ${calendarType} | Timeframe: ${timeframe.charAt(0).toUpperCase()+timeframe.slice(1)}
      </div>
      <h2>Payment‐Method Breakdown</h2>
    `;
    
    const chartData = computeChartData();
    if (!chartData.length) {
      html += `<p>No product sales on this date.</p>`;
    } else {
      html += `<ul>${chartData.map(s => `<li><strong>${s.name}:</strong> ${s.count}</li>`).join('')}</ul>`;
    }
    
    html += `<h2>Product Transactions</h2>`;
    if (!productTxs.length) {
      html += `<p>No product sales on this date.</p>`;
    } else {
      html += `<table><thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th>
        <th>Total</th><th>Payment</th><th>Time</th></tr></thead><tbody>`;
      productTxs.forEach((item, index) => {
        const price = parseFloat(item.Sold_Price)||0;
        const qty = parseInt(item.quantity_sold||item.quantity||'0',10);
        const total = price*qty;
        const time = formatTime12Hour(item.transaction_date.slice(11,19));
        html += `<tr>
          <td>${item.product_name}</td>
          <td>${qty}</td>
          <td>$${price.toFixed(2)}</td>
          <td>$${total.toFixed(2)}</td>
          <td>${item.payment_method}</td>
          <td>${time}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    
    html += `<h2>Spending Transactions</h2>`;
    if (!spendingTxs.length) {
      html += `<p>No spending transactions on this date.</p>`;
    } else {
      html += `<table><thead><tr><th>Amount</th><th>Description</th><th>Time</th></tr></thead><tbody>`;
      spendingTxs.forEach((item, index) => {
        const amt = parseFloat(item.amount)||0;
        const desc = item.description||'No description';
        const time = formatTime12Hour(item.transaction_date.slice(11,19));
        html += `<tr>
          <td>$${amt.toFixed(2)}</td>
          <td>${desc}</td>
          <td>${time}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</body></html>`;
    return html;
  };

  const generatePDF = async () => {
    if (!productTxs.length && !spendingTxs.length) {
      return Alert.alert('Nothing to Print', 'There is no data for this date/timeframe.');
    }
    try {
      const htmlString = buildHTMLforPDF();
      const displayDate = getDisplayDate().replace(/\s/g, '_');
      const cal = isEthiopianCalendar ? 'ethiopian' : 'gregorian';
      const fileName = `report_${displayDate}_${cal}_${timeframe}`;
      const file = await RNHTMLtoPDF.convert({ html: htmlString, fileName, directory: 'Documents' });
      Alert.alert('PDF Generated', `Saved to:\n${file.filePath}`);
    } catch (err) {
      console.error(err);
      Alert.alert('PDF Error', 'Could not generate PDF. Ensure the module is linked and rebuilt.');
    }
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found. Please log in again.');
      transactionsApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const start = formatDateTime(selectedDate, false);
      const end = formatDateTime(selectedDate, true);
      const resp = await transactionsApi.get('', {
        params: { action: 'get_reports', filter: timeframe, start, end },
      });
      if (resp.data.productTransactions && resp.data.spendingTransactions) {
        setProductTxs(resp.data.productTransactions);
        setSpendingTxs(resp.data.spendingTransactions);
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err) {
      console.error(err);
      let msg = 'Could not fetch transactions. Please try again.';
      if (axios.isAxiosError(err)) {
        if (err.response) {
          msg = err.response.data?.message || `Server Error: ${err.response.status}`;
          if (err.response.status === 401) msg = 'Session expired. Please log in again.';
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

  const onChangeDate = (e, date) => {
    setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const renderProductItem = ({ item, index }) => {
    const price = parseFloat(item.Sold_Price) || 0;
    const qty = parseInt(item.quantity_sold || item.quantity || '0', 10);
    const total = price * qty;
    const time = formatTime12Hour(item.transaction_date.slice(11, 19));
    
    return (
      <ListItem 
        bottomDivider 
        containerStyle={styles.listItem}
      >
        <Icon name="inventory" type="material" color="#3498db" />
        <ListItem.Content>
          <ListItem.Title style={styles.listTitle}>{item.product_name}</ListItem.Title>
          <ListItem.Subtitle style={styles.listSubtitle}>
            {qty} × ${price.toFixed(2)} = ${total.toFixed(2)}
          </ListItem.Subtitle>
        </ListItem.Content>
        <View style={styles.trailingContainer}>
          <Text style={styles.txDate}>{time}</Text>
          <Text style={styles.paymentBadge}>{item.payment_method}</Text>
        </View>
      </ListItem>
    );
  };

  const renderSpendingItem = ({ item, index }) => {
    const amt = parseFloat(item.amount) || 0;
    const desc = item.description || 'No description';
    const time = formatTime12Hour(item.transaction_date.slice(11, 19));
    
    return (
      <ListItem 
        bottomDivider 
        containerStyle={styles.listItem}
      >
        <Icon name="money-off" type="material" color="#e74c3c" />
        <ListItem.Content>
          <ListItem.Title style={styles.amountText}>${amt.toFixed(2)}</ListItem.Title>
          <ListItem.Subtitle style={styles.listSubtitle}>{desc}</ListItem.Subtitle>
        </ListItem.Content>
        <View style={styles.trailingContainer}>
          <Text style={styles.txDate}>{time}</Text>
        </View>
      </ListItem>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.screenTitle}>Detailed Transactions</Text>
      
      <View style={styles.dateRow}>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateLabel}>
            {isEthiopianCalendar ? 'Ethiopian Date' : 'Gregorian Date'}
          </Text>
          <Text style={styles.dateValue}>{getDisplayDate()}</Text>
        </View>
        
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={styles.calendarToggle} 
            onPress={toggleCalendar}
          >
            <Text style={styles.calendarToggleText}>
              {isEthiopianCalendar ? 'ET' : 'GR'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowPicker(true)}
          >
            <Icon name="calendar-month" type="material" color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={generatePDF}
        >
          <Icon name="print" type="material" color="#fff" />
          <Text style={styles.actionButtonText}>Export PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChartSection = () => {
    const data = computeChartData();
    
    return (
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Payment Distribution</Text>
        
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="pie-chart" type="material" size={40} color="#bdc3c7" />
            <Text style={styles.emptyText}>No payment data available</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <PieChart
              data={data}
              width={screenWidth - 40}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="10"
              absolute
            />
            <View style={styles.chartLegend}>
              {data.map((item, index) => (
                <View key={`legend-${item.name}-${index}`} style={styles.legendItem}>
                  <View 
                    style={[styles.legendColor, { backgroundColor: item.color }]} 
                  />
                  <Text style={styles.legendText}>
                    {item.name}: {item.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={40} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchTransactions}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {renderChartSection()}
          
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Product Sales</Text>
            
            {productTxs.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="shopping-cart" type="material" size={40} color="#bdc3c7" />
                <Text style={styles.emptyText}>No product sales recorded</Text>
              </View>
            ) : (
              productTxs.map((item, index) => (
                <View key={`product-${item.id || index}-${Date.now()}`}>
                  {renderProductItem({ item, index })}
                </View>
              ))
            )}
          </View>
          
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            
            {spendingTxs.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="receipt" type="material" size={40} color="#bdc3c7" />
                <Text style={styles.emptyText}>No expenses recorded</Text>
              </View>
            ) : (
              spendingTxs.map((item, index) => (
                <View key={`spending-${item.id || index}-${Date.now()}`}>
                  {renderSpendingItem({ item, index })}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 15,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateDisplay: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarToggle: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  calendarToggleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  dateButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 6,
    padding: 10,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#27ae60',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 15,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 14,
    color: '#34495e',
  },
  transactionsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  listSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
  },
  trailingContainer: {
    alignItems: 'flex-end',
  },
  txDate: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  paymentBadge: {
    backgroundColor: '#ecf0f1',
    color: '#2c3e50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#3498db',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DetailedReportsScreen;