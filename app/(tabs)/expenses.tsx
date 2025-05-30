import React, { useState } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Dimensions,
  View,
  TextInput
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API } from '@/api/api';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Expense } from '@/types/types';
import AddExpenseForm from '@/components/AddExpenseForm';
import { OfflineManager, OfflineExpense } from '@/services/OfflineManager';
import SearchBar from '@/components/SearchBar';

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<(Expense | OfflineExpense)[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<(Expense | OfflineExpense)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const checkAuth = async () => {
    try {
      const isOnline = await OfflineManager.isOnline();
      if (!isOnline) {
        console.log('Tryb offline: Pomijam weryfikację zalogowania');
        setIsAuthenticated(true);
        fetchOfflineExpensesOnly();
        return;
      }

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
      const offlineItems = await fetchOfflineExpenses();
      if (offlineItems.length > 0) {
        setIsAuthenticated(true);
        setExpenses(offlineItems);
        setFilteredExpenses(offlineItems);
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    }
  };

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

  const fetchExpenses = async (pageNumber = 0, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);

      const offlineExpenses = await fetchOfflineExpenses();

      if (offlineExpenses.length > 0) {
        const isOnline = await OfflineManager.isOnline();
        if (isOnline) {
          syncOfflineExpenses();
        }
      }

      try {
        const response = await API.getExpenses({ offset: pageNumber * 20, limit: 20 });

        if (response && response.items) {
          let allExpenses = [];

          if (shouldRefresh || pageNumber === 0) {
            allExpenses = [...offlineExpenses, ...response.items];
            setExpenses(allExpenses);
            setFilteredExpenses(allExpenses);
          } else {
            allExpenses = [...expenses, ...response.items];
            setExpenses(allExpenses);

            // Aktualizuj przefiltrowane wydatki tylko jeśli nie ma aktywnego wyszukiwania
            if (searchQuery.trim() === '') {
              setFilteredExpenses(allExpenses);
            } else {
              handleSearch(searchQuery);
            }
          }

          setHasMore(response.items.length === 20);
        }
      } catch (error) {
        console.error('Błąd podczas pobierania wydatków online:', error);
        if (shouldRefresh || pageNumber === 0) {
          setExpenses(offlineExpenses);
          setFilteredExpenses(offlineExpenses);
        }
      }
    } catch (error) {
      console.error('Błąd podczas pobierania wydatków:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOfflineExpensesOnly = async () => {
    setLoading(true);
    try {
      const offlineExpenses = await fetchOfflineExpenses();
      setExpenses(offlineExpenses);
      setFilteredExpenses(offlineExpenses);
    } catch (error) {
      console.error('Błąd podczas pobierania wydatków offline:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderExpenseItem = ({ item }: { item: Expense | OfflineExpense }) => {
    const isOffline = isOfflineExpense(item);
    const hasImage = !isOffline && 'image_url' in item && item.image_url;

    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => !isOffline && handleViewReceipt(item as Expense)}
        disabled={isOffline || !hasImage}
      >
        <ThemedView style={styles.expenseHeader}>
          <ThemedText type="subtitle">Nazwa</ThemedText>
          <ThemedView style={styles.actionsContainer}>
            {isOffline && (
              <ThemedView style={styles.offlineIconContainer}>
                <IconSymbol size={18} name="wifi.slash" color="#FF9500" />
              </ThemedView>
            )}
            {hasImage && (
              <ThemedView style={styles.cameraIconContainer}>
                <IconSymbol size={18} name="camera" color="#FFFFFF" />
              </ThemedView>
            )}
            {!isOffline && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShareExpense((item as Expense).id)}
              >
                <IconSymbol size={20} name="square.and.arrow.up" color="#007AFF" />
              </TouchableOpacity>
            )}
          </ThemedView>
        </ThemedView>
        <ThemedView style={styles.expenseNameContainer}>
          <ThemedText>{item.name}</ThemedText>
          {isOffline && (
            <ThemedText style={styles.offlineLabel}> (offline)</ThemedText>
          )}
        </ThemedView>
        <ThemedText type="subtitle">Kwota</ThemedText>
        <ThemedText>{item.amount} PLN</ThemedText>
        <ThemedText type="defaultSemiBold">Data dodania</ThemedText>
        <ThemedText>{new Date(item.timestamp).toLocaleDateString()}</ThemedText>
      </TouchableOpacity>
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
      return () => {
        setExpenses([]);
        setFilteredExpenses([]);
        setPage(0);
        setHasMore(true);
      };
    }, [])
  );

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

  const fetchOfflineExpenses = async () => {
    const offlineExpenses = await OfflineManager.getOfflineExpenses();
    const notSyncedExpenses = offlineExpenses.filter(expense => !expense.is_synced);
    setOfflineCount(notSyncedExpenses.length);
    return notSyncedExpenses;
  };

  const syncOfflineExpenses = async () => {
    try {
      setSyncingOffline(true);
      const syncedExpenses = await OfflineManager.syncOfflineExpenses();
      if (syncedExpenses.length > 0) {
        Alert.alert('Synchronizacja', `Zsynchronizowano ${syncedExpenses.length} wydatków`);
        fetchExpenses(0, true);
      }
    } catch (error) {
      console.error('Błąd podczas synchronizacji wydatków offline:', error);
    } finally {
      setSyncingOffline(false);
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

  const handleViewReceipt = (expense: Expense) => {
    if ('image_url' in expense && expense.image_url) {
      setSelectedExpense(expense as Expense);
      setReceiptModalVisible(true);
    }
  };

  const isOfflineExpense = (expense: Expense | OfflineExpense): expense is OfflineExpense => {
    return 'local_id' in expense;
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
          <ThemedView style={styles.header}>
            <ThemedText type="title">Moje wydatki</ThemedText>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <IconSymbol name="arrow.clockwise" size={22} color="#007AFF" />
            </TouchableOpacity>
          </ThemedView>
          <ThemedText>Nie masz jeszcze żadnych wydatków</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAddExpenseVisible(true)}
          >
            <IconSymbol size={20} name="plus" color="white" />
            <ThemedText style={styles.addButtonText}>Dodaj wydatek</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <>
          <ThemedView style={[styles.headerWithAction, styles.topMargin]}>
            <ThemedView>
              <ThemedText type="title">Moje wydatki</ThemedText>
              <ThemedText>Zarządzaj swoimi wydatkami</ThemedText>
            </ThemedView>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <IconSymbol name="arrow.clockwise" size={22} color="#007AFF" />
            </TouchableOpacity>
          </ThemedView>

          <SearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Szukaj wydatków..."
          />

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.addButton, styles.actionButton]}
              onPress={() => setIsAddExpenseVisible(true)}
            >
              <IconSymbol size={20} name="plus" color="white" />
              <ThemedText style={styles.addButtonText}>Dodaj wydatek</ThemedText>
            </TouchableOpacity>

            {offlineCount > 0 && (
              <TouchableOpacity
                style={[styles.syncButton, styles.actionButton, syncingOffline && styles.disabledButton]}
                onPress={syncOfflineExpenses}
                disabled={syncingOffline}
              >
                {syncingOffline ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <IconSymbol size={20} name="arrow.clockwise" color="white" />
                    <ThemedText style={styles.syncButtonText}>
                      Synchronizuj ({offlineCount})
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredExpenses}
            keyExtractor={(item) => isOfflineExpense(item) ? item.local_id : item.id}
            renderItem={renderExpenseItem}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            style={styles.list}
            ListEmptyComponent={
              <ThemedView style={styles.emptySearchContainer}>
                <ThemedText>Nie znaleziono żadnych wydatków</ThemedText>
              </ThemedView>
            }
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

      <AddExpenseForm
        visible={isAddExpenseVisible}
        onClose={() => setIsAddExpenseVisible(false)}
        onExpenseAdded={handleRefresh}
      />

      <Modal
        visible={receiptModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <ThemedView style={styles.receiptModalContainer}>
          <ThemedView style={styles.receiptModalContent}>
            <ThemedText type="title" style={styles.receiptModalTitle}>
              Paragon: {selectedExpense?.name}
            </ThemedText>
            <ThemedText style={styles.receiptModalSubtitle}>
              {selectedExpense?.amount} PLN - {new Date(selectedExpense?.timestamp || '').toLocaleDateString()}
            </ThemedText>

            {selectedExpense?.image_url ? (
              <Image
                source={{ uri: selectedExpense.image_url }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            ) : (
              <ThemedText style={styles.noReceiptText}>Brak zdjęcia paragonu</ThemedText>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setReceiptModalVisible(false)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
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
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  receiptIconContainer: {
    marginRight: 8,
  },
  offlineIconContainer: {
    marginRight: 8,
  },
  expenseNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineLabel: {
    color: '#FF9500',
    fontStyle: 'italic',
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
  centerButton: {
    alignSelf: 'center',
  },
  topMargin: {
    marginTop: 16,
  },
  receiptModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  receiptModalContent: {
    padding: 20,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
  },
  receiptModalTitle: {
    marginBottom: 10,
  },
  receiptModalSubtitle: {
    marginBottom: 20,
  },
  receiptImage: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').height * 0.5,
    marginBottom: 20,
  },
  noReceiptText: {
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  syncButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#A9A9A9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    marginLeft: 10,
    color: '#000',
    fontSize: 16,
  },
  emptySearchContainer: {
    padding: 20,
    alignItems: 'center',
  },
  cameraIconContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 4,
    marginRight: 8,
  },
});
