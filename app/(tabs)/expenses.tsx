import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API } from '@/api/api';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Expense } from '@/types/types';

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');

      if (authToken) {
        try {
          const user = await API.getCurrentUser();
          setIsAuthenticated(!!user);
          if (user) {
            fetchExpenses();
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

  const fetchExpenses = async (pageNumber = 0, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);
      const response = await API.getExpenses({ offset: pageNumber * 20, limit: 20 });

      if (response && response.items) {
        if (shouldRefresh) {
          setExpenses(response.items);
        } else {
          setExpenses(prev => [...prev, ...response.items]);
        }
        setHasMore(response.items.length === 20);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania wydatków:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleRefresh = () => {
    setPage(0);
    fetchExpenses(0, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchExpenses(nextPage);
    }
  };

  const handleShareExpense = async (expenseId: string) => {
    try {
      await API.shareExpense(expenseId);
      Alert.alert('Sukces', 'Wydatek został udostępniony publicznie');
      handleRefresh();
    } catch (error) {
      console.error('Błąd podczas udostępniania wydatku:', error);
      Alert.alert('Błąd', 'Nie udało się udostępnić wydatku');
    }
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    return (
      <ThemedView style={styles.expenseCard}>
        <ThemedView style={styles.expenseHeader}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleShareExpense(item.id)}
          >
            <IconSymbol size={20} name="square.and.arrow.up" color="#007AFF" />
          </TouchableOpacity>
        </ThemedView>
        <ThemedText>{item.amount} PLN</ThemedText>
        <ThemedText type="defaultSemiBold">Kategoria</ThemedText>
        <ThemedText>{new Date(item.timestamp).toLocaleDateString()}</ThemedText>
      </ThemedView>
    );
  };

  if (!isAuthenticated && !loading) {
    return (
      <ThemedView style={[styles.container, styles.authContainer]}>
        <ThemedView style={styles.authContent}>
          <ThemedText type="title">Wymagane logowanie</ThemedText>
          <ThemedText style={styles.message}>Zaloguj się, aby zobaczyć swoje wydatki</ThemedText>
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
      {loading && page === 0 ? (
        <ThemedView style={[styles.loadingContainer, styles.topMargin]}>
          <ActivityIndicator size="large" />
        </ThemedView>
      ) : !expenses.length ? (
        <ThemedView style={[styles.emptyContainer, styles.topMargin]}>
          <ThemedText>Nie masz jeszcze żadnych wydatków</ThemedText>
        </ThemedView>
      ) : (
        <>
          <ThemedView style={[styles.headerContent, styles.topMargin]}>
            <ThemedText type="title">Moje wydatki</ThemedText>
            <ThemedText>Zarządzaj swoimi wydatkami</ThemedText>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => Alert.alert('Dodaj wydatek', 'Tu będzie formularz dodawania wydatku')}
            >
              <IconSymbol size={20} name="plus" color="white" />
              <ThemedText style={styles.addButtonText}>Dodaj wydatek</ThemedText>
            </TouchableOpacity>
          </ThemedView>
          <FlatList
            data={expenses}
            keyExtractor={(item) => item.id}
            renderItem={renderExpenseItem}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            style={styles.list}
            ListFooterComponent={
              loading && page > 0 ? (
                <ThemedView style={styles.footerLoader}>
                  <ActivityIndicator size="small" />
                </ThemedView>
              ) : null
            }
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  authContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContent: {
    alignItems: 'center',
  },
  headerContent: {
    padding: 16,
    alignItems: 'center',
  },
  expenseCard: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareButton: {
    padding: 8,
  },
  list: {
    width: '100%',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  message: {
    marginVertical: 20,
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
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  topMargin: {
    marginTop: 16,
  },
});
