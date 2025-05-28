import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { API } from '@/api/api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Expense } from '@/types/types';

export default function PublicExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPublicExpenses = async (pageNumber = 0, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);
      const response = await API.getPublicExpenses({ offset: pageNumber * 20, limit: 20 });

      if (response && response.items) {
        if (shouldRefresh) {
          setExpenses(response.items);
        } else {
          setExpenses(prev => [...prev, ...response.items]);
        }
        setHasMore(response.items.length === 20);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania publicznych wydatków:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublicExpenses();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchPublicExpenses(0, true);
    }, [])
  );

  const handleRefresh = () => {
    setPage(0);
    fetchPublicExpenses(0, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPublicExpenses(nextPage);
    }
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    return (
      <ThemedView style={styles.expenseCard}>
        <ThemedText type="subtitle">Nazwa</ThemedText>
        <ThemedText>{item.name}</ThemedText>
        <ThemedText type="subtitle">Kwota</ThemedText>
        <ThemedText>{item.amount} PLN</ThemedText>
        <ThemedText type="defaultSemiBold">Data dodania</ThemedText>
        <ThemedText>{new Date(item.timestamp).toLocaleDateString()}</ThemedText>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Nagłówek z przyciskiem odświeżania */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Publiczne Wydatki</ThemedText>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <IconSymbol name="arrow.clockwise" size={22} color="#007AFF" />
        </TouchableOpacity>
      </ThemedView>

      <ThemedText style={styles.subtitle}>Ostatnie udostępnione wydatki użytkowników</ThemedText>

      {loading && page === 0 ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </ThemedView>
      ) : expenses.length > 0 ? (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            loading && page > 0 ? (
              <ThemedView style={styles.footerLoader}>
                <ActivityIndicator size="small" />
              </ThemedView>
            ) : null
          }
        />
      ) : (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText>Brak publicznych wydatków do wyświetlenia</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 36
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  subtitle: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  refreshButton: {
    padding: 8,
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
  list: {
    width: '100%',
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  }
});
