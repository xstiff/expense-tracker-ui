import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

import { API } from '@/api/api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Category, ExpenseBase } from '@/types/types';

interface AddExpenseFormProps {
  visible: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
}

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AddExpenseForm({ visible, onClose, onExpenseAdded }: AddExpenseFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Pobierz kategorie przy otwarciu formularza
  useEffect(() => {
    if (visible) {
      fetchCategories();
      // Reset form values
      setName('');
      setAmount('');
      setCategoryId(null);
      setDate(new Date());
    }
  }, [visible]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await API.getCategories();
      if (response && response.items) {
        setCategories(response.items);
        if (response.items.length > 0) {
          setCategoryId(response.items[0].id);
        }
      }
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać kategorii');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleSubmit = async () => {
    // Walidacja formularza
    if (!name.trim()) {
      Alert.alert('Błąd', 'Podaj nazwę wydatku');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Błąd', 'Podaj poprawną kwotę');
      return;
    }

    if (!categoryId) {
      Alert.alert('Błąd', 'Wybierz kategorię');
      return;
    }

    try {
      setLoading(true);

      const expenseData: ExpenseBase = {
        name: name.trim(),
        amount: parseFloat(amount),
        category_id: categoryId,
        timestamp: formatDate(date),
        is_offline: false,
        is_public: false
      };

      await API.createExpense({
        expense_base: expenseData
      });

      Alert.alert('Sukces', 'Wydatek został dodany');
      onExpenseAdded(); // Odśwież listę wydatków
      onClose(); // Zamknij modal
    } catch (error) {
      console.error('Błąd podczas dodawania wydatku:', error);
      Alert.alert('Błąd', 'Nie udało się dodać wydatku');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <ThemedView style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText type="title" style={styles.title}>Dodaj nowy wydatek</ThemedText>

            <ThemedText style={styles.label}>Nazwa wydatku</ThemedText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nazwa wydatku"
            />

            <ThemedText style={styles.label}>Kwota (PLN)</ThemedText>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <ThemedText style={styles.label}>Data</ThemedText>
            <TouchableOpacity onPress={showDatepicker} style={styles.dateButton}>
              <ThemedText>{formatDate(date)}</ThemedText>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <ThemedText style={styles.label}>Kategoria</ThemedText>
            {loadingCategories ? (
              <ActivityIndicator size="small" style={styles.loader} />
            ) : categories.length > 0 ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={categoryId}
                  onValueChange={(itemValue) => setCategoryId(itemValue)}
                  style={styles.picker}
                >
                  {categories.map((category) => (
                    <Picker.Item key={category.id} label={category.name} value={category.id} />
                  ))}
                </Picker>
              </View>
            ) : (
              <ThemedText style={styles.noCategories}>Brak dostępnych kategorii</ThemedText>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <ThemedText style={styles.buttonText}>Anuluj</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={styles.buttonText}>Zapisz</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  scrollContent: {
    paddingBottom: 20
  },
  title: {
    textAlign: 'center',
    marginBottom: 20
  },
  label: {
    marginTop: 15,
    marginBottom: 5
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff'
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  noCategories: {
    padding: 10,
    textAlign: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 10
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 10
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  loader: {
    marginVertical: 10
  }
});
