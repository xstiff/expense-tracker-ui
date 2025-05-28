import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { API } from '@/api/api';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Category } from '@/types/types';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const checkAuth = async () => {
    try {
      const user = await API.getCurrentUser();
      setIsAuthenticated(!!user);
      if (user) {
        fetchCategories();
      }
    } catch (_error) {
      setIsAuthenticated(false);
      router.push('/(tabs)/account');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setRefreshing(true);
      const response = await API.getCategories();
      if (response && response.items) {
        setCategories(response.items);
      }
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać kategorii');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
    }, [])
  );

  const handleRefresh = () => {
    fetchCategories();
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Błąd', 'Nazwa kategorii nie może być pusta');
      return;
    }

    try {
      setLoading(true);
      await API.createCategory({
        name: newCategoryName.trim(),
        is_offline: false
      });
      setNewCategoryName('');
      fetchCategories();
      Alert.alert('Sukces', 'Kategoria została utworzona');
    } catch (error) {
      console.error('Błąd podczas tworzenia kategorii:', error);
      Alert.alert('Błąd', 'Nie udało się utworzyć kategorii');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    return (
      <ThemedView style={styles.categoryCard}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText>ID: {item.id}</ThemedText>
      </ThemedView>
    );
  };

  if (!isAuthenticated && !loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedView style={styles.authContent}>
          <ThemedText type="title">Wymagane logowanie</ThemedText>
          <ThemedText style={styles.message}>Zaloguj się, aby zarządzać kategoriami</ThemedText>
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
      {loading && !refreshing ? (
        <ThemedView style={[styles.loadingContainer, styles.topMargin]}>
          <ActivityIndicator size="large" />
        </ThemedView>
      ) : (
        <>
          <ThemedView style={[styles.headerContent, styles.topMargin]}>
            <ThemedText type="title">Kategorie</ThemedText>
            <ThemedText>Zarządzaj kategoriami wydatków</ThemedText>
          </ThemedView>

          <ThemedView style={styles.content}>
            <ThemedView style={styles.addCategoryContainer}>
              <ThemedText type="subtitle">Dodaj nową kategorię</ThemedText>
              <ThemedView style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Nazwa kategorii"
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleCreateCategory}
                  disabled={loading}
                >
                  <IconSymbol size={20} name="plus" color="white" />
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>

            <ThemedText type="subtitle" style={styles.listTitle}>Twoje kategorie</ThemedText>

            {categories.length > 0 ? (
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                style={styles.list}
              />
            ) : (
              <ThemedView style={styles.emptyContainer}>
                <ThemedText>Nie masz jeszcze żadnych kategorii</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    padding: 16,
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  categoryCard: {
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
  },
  listTitle: {
    marginTop: 20,
    marginBottom: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  addCategoryContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  authContent: {
    padding: 20,
    alignItems: 'center',
  },
  topMargin: {
    marginTop: 20,
  },
});
