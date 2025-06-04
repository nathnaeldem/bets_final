import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-elements';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.usernameText}>{user?.username}</Text>
        <Text style={styles.roleBadge}>{user?.role.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.infoText}>Shop Management Portal</Text>
        
        <View style={styles.buttonGroup}>
          {user?.role === 'admin' ? (
            <>
              <Button
                title="Manage Products"
                buttonStyle={styles.primaryButton}
                titleStyle={styles.buttonTitle}
                icon={<MaterialIcons name="inventory" size={22} color="white" style={styles.icon} />}
                onPress={() => navigation.navigate('ProductList')}
              />
              <Button
                title="Sales Dashboard"
                buttonStyle={styles.secondaryButton}
                titleStyle={styles.buttonTitle}
                icon={<MaterialIcons name="analytics" size={22} color="white" style={styles.icon} />}
                onPress={() => navigation.navigate('Sales')}
              />
              <Button
                title="Analytics & Reports"
                buttonStyle={styles.analyticsButton}
                titleStyle={styles.buttonTitle}
                icon={<MaterialIcons name="insert-chart" size={22} color="white" style={styles.icon} />}
                onPress={() => navigation.navigate('Reports')}
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
                title="New Sale"
                buttonStyle={styles.secondaryButton}
                titleStyle={styles.buttonTitle}
                icon={<MaterialIcons name="attach-money" size={22} color="white" style={styles.icon} />}
                onPress={() => navigation.navigate('Sales')}
              />
            </>
          )}
          <Button
            title="Record Spending"
            buttonStyle={styles.tertiaryButton}
            titleStyle={styles.buttonTitle}
            icon={<MaterialIcons name="account-balance-wallet" size={22} color="white" style={styles.icon} />}
            onPress={() => navigation.navigate('Spending')}
          />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    color: '#2d3436',
    fontWeight: '300',
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
  primaryButton: {
    backgroundColor: '#0984e3',
    borderRadius: 12,
    height: 56,
    paddingVertical: 8,
  },
  secondaryButton: {
    backgroundColor: '#00b894',
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
  analyticsButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 10,
    marginTop: 10,
    padding: 15,
  },
});

export default HomeScreen;