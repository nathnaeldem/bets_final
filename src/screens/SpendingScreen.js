import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Input } from 'react-native-elements';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { authApi } from '../api/authApi';

const SpendingScreen = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('purchase');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    try {
      const data = await authApi.addSpending({
        user_id: user.id,
        amount: parseFloat(amount),
        category,
        reason,
        comment
      });

      if (data.success) {
        // Clear form
        setAmount('');
        setCategory('purchase');
        setReason('');
        setComment('');
        alert('Spending recorded successfully!');
      } else {
        alert('Failed to record spending: ' + data.message);
      }
    } catch (error) {
      alert('Error recording spending: ' + error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text h4 style={styles.title}>Record Spending</Text>

        <Input
          placeholder="Amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          leftIcon={<MaterialIcons name="attach-money" size={24} color="gray" />}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Category</Text>
          <Picker
            selectedValue={category}
            onValueChange={setCategory}
            style={styles.picker}
          >
            <Picker.Item label="Purchase" value="purchase" />
            <Picker.Item label="Logistics" value="logistics" />
            <Picker.Item label="Consumption" value="consumption" />
          </Picker>
        </View>

        <Input
          placeholder="Reason"
          value={reason}
          onChangeText={setReason}
          leftIcon={<MaterialIcons name="description" size={24} color="gray" />}
        />

        {/* <Input
          placeholder="Comment (optional)"
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
          leftIcon={<MaterialIcons name="comment" size={24} color="gray" />}
        /> */}

        <Button
          title="Record Spending"
          onPress={handleSubmit}
          buttonStyle={styles.button}
          disabled={!amount || !reason}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: 'gray',
    marginLeft: 10,
    marginBottom: 5,
  },
  picker: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#2089dc',
    borderRadius: 10,
    marginTop: 20,
  },
});

export default SpendingScreen;