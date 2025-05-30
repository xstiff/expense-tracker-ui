import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, View, Image, Modal, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { API } from '@/api/api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Expense } from '@/types/types';
import SearchBar from '@/components/SearchBar';

export default function PublicExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleSearch = (text: string) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setFilteredExpenses(expenses);
      return;
    }

    const filtered = expenses.filter(expense =>
      expense.name.toLowerCase().includes(text.toLowerCase()) ||
      expense.amount.toString().includes(text) ||
      new Date(expense.timestamp).toLocaleDateString().includes(text)
    );

    setFilteredExpenses(filtered);
  };

  const fetchPublicExpenses = async (pageNumber = 0, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);
      const response = await API.getPublicExpenses({ offset: pageNumber * 20, limit: 20 });

      if (response && response.items) {
        if (shouldRefresh) {
          setExpenses(response.items);
          setFilteredExpenses(response.items);
        } else {
          const newExpenses = [...expenses, ...response.items];
          setExpenses(newExpenses);

          // Aktualizuj przefiltrowane wydatki tylko jeśli nie ma aktywnego wyszukiwania
          if (searchQuery.trim() === '') {
            setFilteredExpenses(newExpenses);
          } else {
            handleSearch(searchQuery);
          }
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
    const hasImage = item.image_url ? true : false;

    const handleImagePress = () => {
      if (item.image_url) {
        setSelectedImage(item.image_url);
        setModalVisible(true);
      }
    };

    return (
      <ThemedView style={styles.expenseCard}>
        <ThemedView style={styles.expenseHeader}>
          <ThemedText type="subtitle">Nazwa</ThemedText>
          {hasImage && (
            <TouchableOpacity style={styles.cameraIconContainer} onPress={handleImagePress}>
              <IconSymbol size={18} name="camera" color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </ThemedView>
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

      <SearchBar
        placeholder="Wyszukaj wydatki..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      <ThemedText style={styles.subtitle}>Ostatnie udostępnione wydatki użytkowników</ThemedText>

      {loading && page === 0 ? (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </ThemedView>
      ) : filteredExpenses.length > 0 ? (
        <FlatList
          data={filteredExpenses}
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

      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="title" style={styles.modalTitle}>
              Paragon
            </ThemedText>

            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.closeButtonText}>Zamknij</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraIconContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 4,
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '90%',
  },
  modalTitle: {
    marginBottom: 16,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalImage: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.5,
  },
});
