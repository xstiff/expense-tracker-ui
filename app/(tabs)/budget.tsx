import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API } from '@/api/api';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Budget } from '@/types/types';

export default function BudgetScreen() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [newBudgetAmount, setNewBudgetAmount] = useState('');

  const checkAuth = async () => {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');

      if (authToken) {
        try {
          const user = await API.getCurrentUser();
          setIsAuthenticated(!!user);
          if (user) {
            fetchBudget();
            return;
          }
        } catch (tokenError) {
          console.log('Token nieprawidłowy lub wygasł:', tokenError);
          await AsyncStorage.removeItem('auth_token');
        }
      }

      setIsAuthenticated(false);
      setLoading(false);
    } catch (_error) {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const budgetData = await API.getBudgetForMonth({ year, month });
      setBudget(budgetData);
    } catch (error) {
      console.error('Błąd podczas pobierania budżetu:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać budżetu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Sprawdzaj autentykację za każdym razem, gdy ekran otrzymuje focus
  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
    }, [])
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchBudget();
    }
  }, [year, month, isAuthenticated]);

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return months[month - 1];
  };

  const handleSaveBudget = async () => {
    try {
      if (!newBudgetAmount) {
        Alert.alert('Błąd', 'Wprowadź kwotę budżetu');
        return;
      }

      const amount = parseFloat(newBudgetAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Błąd', 'Wprowadź poprawną kwotę');
        return;
      }

      setLoading(true);
      await API.setBudgetForMonth({
        year,
        month,
        max_budget: amount,
        is_offline: false
      });

      Alert.alert('Sukces', 'Budżet został zapisany');
      fetchBudget();
      setNewBudgetAmount('');
    } catch (error) {
      console.error('Błąd podczas zapisywania budżetu:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać budżetu');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated && !loading) {
    return (
      <ThemedView style={[styles.container, styles.authContainer]}>
        <ThemedView style={styles.authContent}>
          <ThemedText type="title">Wymagane logowanie</ThemedText>
          <ThemedText style={styles.message}>Zaloguj się, aby zarządzać budżetem</ThemedText>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(tabs)/account')}
          >
            <ThemedText style={styles.buttonText}>Przejdź do logowania</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <ThemedView style={[styles.headerContent, styles.topMargin]}>
            <ThemedText type="title">Budżet miesięczny</ThemedText>
            <ThemedText>Ustaw i śledź swój budżet</ThemedText>
          </ThemedView>
        }>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePreviousMonth}>
              <ThemedText type="defaultSemiBold" style={styles.monthButton}>{'<'}</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle">{getMonthName(month)} {year}</ThemedText>
            <TouchableOpacity onPress={handleNextMonth}>
              <ThemedText type="defaultSemiBold" style={styles.monthButton}>{'>'}</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {loading ? (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </ThemedView>
          ) : (
            <ThemedView style={styles.budgetContainer}>
              {budget ? (
                <>
                  <ThemedView style={styles.budgetInfo}>
                    <ThemedText type="subtitle">Obecny budżet</ThemedText>
                    <ThemedText type="title">{budget.max_budget} PLN</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.spentInfo}>
                    <ThemedText>Wydano: {budget.max_budget - (budget.remaining_budget || 0)} PLN</ThemedText>
                    <ThemedText>Pozostało: {budget.remaining_budget || 0} PLN</ThemedText>
                  </ThemedView>
                </>
              ) : (
                <ThemedView style={styles.noBudgetContainer}>
                  <ThemedText type="subtitle">Nie ustawiono budżetu na ten miesiąc</ThemedText>
                </ThemedView>
              )}

              <ThemedView style={styles.setBudgetContainer}>
                <ThemedText type="subtitle">Ustaw budżet</ThemedText>
                <ThemedView style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={newBudgetAmount}
                    onChangeText={setNewBudgetAmount}
                    placeholder="Wpisz kwotę budżetu"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveBudget}
                  >
                    <ThemedText style={styles.buttonText}>Zapisz</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>
      </ParallaxScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  authContainer: {
    justifyContent: 'center',
  },
  authContent: {
    alignItems: 'center',
  },
  headerContent: {
    padding: 16,
    alignItems: 'center',
  },
  topMargin: {
    marginTop: 16,
  },
  content: {
    padding: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  monthButton: {
    fontSize: 24,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  budgetContainer: {
    marginTop: 16,
  },
  budgetInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  spentInfo: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  noBudgetContainer: {
    alignItems: 'center',
    padding: 20,
  },
  setBudgetContainer: {
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    marginLeft: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  message: {
    marginVertical: 20,
  },
});
