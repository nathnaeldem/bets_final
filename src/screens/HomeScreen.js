import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  Text as RNText 
} from 'react-native';
import { Text, Button } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://dankula.x10.mx/auth.php';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [unpaidTransactions, setUnpaidTransactions] = useState([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [error, setError] = useState(null);
  const [partialPaymentModal, setPartialPaymentModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getAuthToken = async () => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (e) {
      console.error("Failed to get token from storage:", e);
      return null;
    }
  };

  const fetchUnpaidTransactions = useCallback(async () => {
    if (user?.role !== 'admin') return;
    
    setLoadingUnpaid(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}?action=get_unpaid_transactions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();

      if (data && data.success && Array.isArray(data.transactions)) {
        const validUnpaid = data.transactions
          .map(tx => ({
            ...tx,
            unpaid_amount: parseFloat(tx.unpaid_amount) || 0
          }))
          .filter(tx => tx.unpaid_amount > 0);
        setUnpaidTransactions(validUnpaid);
      } else {
        throw new Error(data.message || 'Invalid data format received from server');
      }
    } catch (error) {
      console.error("Failed to fetch unpaid transactions:", error);
      setError(error.message);
    } finally {
      setLoadingUnpaid(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnpaidTransactions();
  }, [fetchUnpaidTransactions]);

  const handlePayUnpaid = async (transactionId, amount) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${API_URL}?action=pay_unpaid_amount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount: amount
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.success) {
          setUnpaidTransactions(prev => 
            prev.map(tx => 
              tx.id === transactionId 
                ? { ...tx, unpaid_amount: tx.unpaid_amount - amount } 
                : tx
            ).filter(tx => tx.unpaid_amount > 0)
          );
          setError(null);
        } else {
          throw new Error('Payment failed on server');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Payment failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError(`Payment failed: ${error.message}`);
    }
  };

  const openPartialPayment = (transaction) => {
    setSelectedTransaction(transaction);
    setPaymentAmount('');
    setPartialPaymentModal(true);
    setError(null);
  };

  const handlePartialPayment = () => {
    if (!selectedTransaction || !paymentAmount) {
      setError('Please enter a payment amount');
      return;
    }
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) ){
      setError('Please enter a valid number');
      return;
    }
    
    if (amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    
    if (amount > selectedTransaction.unpaid_amount) {
      setError('Amount cannot exceed unpaid balance');
      return;
    }
    
    handlePayUnpaid(selectedTransaction.id, amount);
    setPartialPaymentModal(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0984e3" />
        <Text style={styles.loadingText}>Loading portal...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            {user?.role === 'admin' && (
              <View style={styles.unpaidSection}>
                <TouchableOpacity
                  style={[
                    styles.unpaidCounterButton,
                    unpaidTransactions.length === 0 && styles.disabledButton
                  ]}
                  onPress={() => setShowUnpaid(true)}
                  disabled={loadingUnpaid || unpaidTransactions.length === 0}
                >
                  {loadingUnpaid ? (
                    <ActivityIndicator color="#e74c3c" size="small" />
                  ) : (
                    <View style={styles.unpaidCounterInner}>
                      <MaterialIcons name="monetization-on" size={20} color="#e74c3c" />
                      <Text style={styles.unpaidCounterText}>
                        {unpaidTransactions.length} Unpaid
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={fetchUnpaidTransactions} style={styles.refreshButton} disabled={loadingUnpaid}>
                  <MaterialIcons name="refresh" size={28} color="#2d3436" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={styles.usernameText}>{user?.username}</Text>
          <Text style={styles.roleBadge}>{user?.role?.toUpperCase()}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.infoText}>Betselot Centeral</Text>
          <View style={styles.buttonGroup}>
            {user?.role === 'admin' ? (
              <>
                <Button
                  title="Place Product Order"
                  buttonStyle={styles.orderButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="add-shopping-cart" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('ProductOrder')}
                />
                <Button
                  title="New Transactions"
                  buttonStyle={styles.newTransactionButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="receipt" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('NewTransactions')}
                />
                <Button
                  title="Order History"
                  buttonStyle={styles.orderHistoryButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="history" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('OrderHistory')}
                />
                
                <Button
                  title="Manage Products"
                  buttonStyle={styles.primaryButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="inventory" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('ProductList')}
                />
                <Button
                  title="Bank Deposit"
                  onPress={() => navigation.navigate('BankDeposit')}
                  buttonStyle={styles.tertiaryButton}
                  titleStyle={styles.buttonTitle}
                  icon={
                    <MaterialIcons 
                      name="account-balance" 
                      size={24} 
                      color="white" 
                      style={styles.icon} 
                    />
                  }
                />
                <Button
                  title="New Sale"
                  buttonStyle={styles.newSaleButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="point-of-sale" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('Sales')}
                />
                <Button
                  title="Credit Register"
                  buttonStyle={styles.creditRegisterButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="credit-card" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('CreditRegister')}
                />
                <Button
                  title="Record Spending"
                  buttonStyle={styles.recordSpendingButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="money-off" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('Spending')}
                />
                <Button
                  title="Analytics & Reports"
                  buttonStyle={styles.analyticsButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="insert-chart" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('Reports')}
                />
                <RNText style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>ላቭያጆ</RNText>
                <Button
                  title="Vehicle Management"
                  buttonStyle={styles.vehicleButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="directions-car" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('AdminVehicleManagement')}
                />
                <Button
                  title="Car wash"
                  buttonStyle={styles.carWashButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="local-car-wash" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('CarWashScreen')}
                />
                <Button
                  title="Record Car Wash Spending"
                  buttonStyle={styles.carWashSpendingButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="car-repair" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('CarWashSpendingScreen')}
                />
                <Button
                  title="Commission Report"
                  buttonStyle={styles.commissionButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="leaderboard" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('CommissionReportScreen')}
                />
                <Button
                  title="User Management"
                  buttonStyle={styles.adminButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="manage-accounts" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('AdminUserManagement')}
                />
                
              </>
            ) : user?.role === 'worker' ? (
              <>
                <Button
                  title="Car wash"
                  buttonStyle={styles.carWashButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="local-car-wash" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('CarWashScreen')}
                />
                <Button
                  title="Record Car Wash Spending"
                  buttonStyle={styles.carWashSpendingButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="car-repair" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('CarWashSpendingScreen')}
                />
               
              </>
            ) : (
              <>
                <Button
                  title="Browse Products"
                  buttonStyle={styles.primaryButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="storefront" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('ProductList')}
                />
                <Button
                  title="Bank Deposit"
                  onPress={() => navigation.navigate('BankDeposit')}
                  buttonStyle={styles.tertiaryButton}
                  titleStyle={styles.buttonTitle}
                  icon={
                    <MaterialIcons 
                      name="account-balance" 
                      size={24} 
                      color="white" 
                      style={styles.icon} 
                    />
                  }
                />
                <Button
                  title="New Sale"
                  buttonStyle={styles.newSaleButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="point-of-sale" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('Sales')}
                />
                <Button
                  title="Record Spending"
                  buttonStyle={styles.recordSpendingButton}
                  titleStyle={styles.buttonTitle}
                  icon={<MaterialIcons name="money-off" size={22} color="white" style={styles.icon} />}
                  onPress={() => navigation.navigate('Spending')}
                />
              </>
            )}
          </View>
        </View>

        <Button
          title="Sign Out"
          type="outline"
          buttonStyle={styles.logoutButton}
          titleStyle={styles.logoutText}
          onPress={logout}
          icon={<MaterialIcons name="logout" size={18} color="#e74c3c" style={styles.logoutIcon} />}
        />
      </ScrollView>

      <Modal visible={showUnpaid} transparent animationType="slide" onRequestClose={() => setShowUnpaid(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unpaid Transactions</Text>
            
            {unpaidTransactions.length === 0 ? (
              <Text style={styles.noTransactionsText}>No unpaid transactions found</Text>
            ) : (
              <ScrollView style={{ width: '100%' }}>
                {unpaidTransactions.map((item) => (
                  <View key={item.id} style={styles.unpaidCard}>
                    <View style={styles.cardHeader}>
                      <RNText style={styles.customerName}>{item.customer_name || 'Unknown Customer'}</RNText>
                      <RNText style={styles.transactionDate}>
                        {new Date(item.transaction_date).toLocaleDateString()}
                      </RNText>
                    </View>
                    <View style={styles.cardBody}>
                      <RNText style={styles.amountLabel}>Amount Due</RNText>
                      <RNText style={styles.unpaidAmount}>
                        ETB {parseFloat(item.unpaid_amount || 0).toFixed(2)}
                      </RNText>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={[styles.actionButton, styles.partialButton]} onPress={() => openPartialPayment(item)}>
                        <MaterialIcons name="payment" size={20} color="#fff" />
                        <RNText style={styles.actionButtonText}>Pay Partial</RNText>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.payButton]} onPress={() => handlePayUnpaid(item.id, item.unpaid_amount)}>
                        <MaterialIcons name="done-all" size={20} color="#fff" />
                        <RNText style={styles.actionButtonText}>Pay Full</RNText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <Button 
              title="Close" 
              onPress={() => setShowUnpaid(false)} 
              buttonStyle={styles.modalCloseButton} 
            />
          </View>
        </View>
      </Modal>

      <Modal visible={partialPaymentModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Partial Payment</Text>
            
            {selectedTransaction && (
              <>
                <RNText style={styles.paymentLabel}>
                  Transaction #{selectedTransaction.id}
                </RNText>
                <RNText style={styles.paymentLabel}>
                  Unpaid Amount: ₦{selectedTransaction.unpaid_amount.toFixed(2)}
                </RNText>
                
                <RNText style={styles.paymentLabel}>Payment Amount:</RNText>
                <View style={styles.inputContainer}>
                  <RNText style={styles.currencySymbol}>₦</RNText>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor="#888"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    autoFocus
                  />
                </View>
                
                {error && (
                  <RNText style={styles.paymentError}>{error}</RNText>
                )}
                
                <View style={styles.buttonRow}>
                  <Button
                    title="Cancel"
                    buttonStyle={styles.cancelButton}
                    onPress={() => {
                      setPartialPaymentModal(false);
                      setError(null);
                    }}
                  />
                  <Button
                    title="Submit Payment"
                    buttonStyle={styles.submitButton}
                    onPress={handlePartialPayment}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#636e72',
  },
  header: {
    marginBottom: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    color: '#2d3436',
    fontWeight: '300',
  },
  unpaidSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unpaidCounterButton: {
    backgroundColor: '#fde2e2',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  refreshButton: {
    marginLeft: 12,
    padding: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  unpaidCounterInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unpaidCounterText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  usernameText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2d3436',
    marginTop: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dfe6e9',
    color: '#636e72',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdecea',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
    marginLeft: 8,
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 16,
  },
  // Button Styles
  orderButton: {
    backgroundColor: '#27ae60', // Green
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  newTransactionButton: {
    backgroundColor: '#2980b9', // Blue
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  orderHistoryButton: {
    backgroundColor: '#16a085', // Teal
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#0984e3', // Royal Blue
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  newSaleButton: {
    backgroundColor: '#1abc9c', // Turquoise
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  creditRegisterButton: {
    backgroundColor: '#e67e22', // Orange
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  recordSpendingButton: {
    backgroundColor: '#7f8c8d', // Gray
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  analyticsButton: {
    backgroundColor: '#9b59b6', // Purple
    borderRadius: 10,
    marginTop: 10,
    padding: 15,
  },
  adminButton: {
    backgroundColor: '#e17055', // Coral
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  tertiaryButton: {
    backgroundColor: '#6c5ce7', // Violet
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  vehicleButton: {
    backgroundColor: '#2ecc71', // Emerald Green
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  carWashButton: {
    backgroundColor: '#3498db', // Bright Blue
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  carWashSpendingButton: {
    backgroundColor: '#d35400', // Pumpkin
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  commissionButton: {
    backgroundColor: '#f39c12', // Orange
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  buttonTitle: {
    fontWeight: '600',
    fontSize: 17,
    marginLeft: 8,
  },
  icon: {
    marginRight: 8,
  },
  logoutButton: {
    borderColor: '#e74c3c',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    marginTop: 32,
  },
  logoutText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  logoutIcon: {
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2d3436',
  },
  noTransactionsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#636e72',
    marginVertical: 20,
  },
  unpaidCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  transactionDate: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  cardBody: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 4,
  },
  unpaidAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  payButton: {
    backgroundColor: '#27ae60',
    marginLeft: 8,
  },
  partialButton: {
    backgroundColor: '#f39c12',
    marginRight: 8,
  },
  paymentInput:{
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  paymentLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#2d3436',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 18,
    marginRight: 5,
    color: '#2d3436',
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#2d3436',
  },
  paymentError: {
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingVertical: 8,
    flex: 1,
    marginRight: 5,
  },
  submitButton: {
    backgroundColor: '#0984e3',
    borderRadius: 8,
    paddingVertical: 8,
    flex: 1,
    marginLeft: 5,
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#0984e3',
    width: 120,
  },
});

export default HomeScreen;