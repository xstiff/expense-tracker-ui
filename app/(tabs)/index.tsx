import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import { API } from '@/api/api';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
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
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText>{item.amount} PLN</ThemedText>
        <ThemedText type="defaultSemiBold">Kategoria</ThemedText>
        <ThemedText>{new Date(item.timestamp).toLocaleDateString()}</ThemedText>
      </ThemedView>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <ThemedView style={styles.headerContent}>
          <ThemedText type="title">Publiczne Wydatki</ThemedText>
          <ThemedText>Ostatnie udostępnione wydatki użytkowników</ThemedText>
        </ThemedView>
      }>
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
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
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
  }
});
