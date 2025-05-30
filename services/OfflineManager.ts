import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ExpenseBase, Expense, Category } from '@/types/types';
import { API } from '@/api/api';

const OFFLINE_EXPENSES_KEY = 'offline_expenses';
const OFFLINE_CATEGORIES_KEY = 'offline_categories';
const AUTH_TOKEN_KEY = 'auth_token';

export interface OfflineExpense extends ExpenseBase {
  local_id: string;
  is_synced: boolean;
}

export class OfflineManager {
  private static _initialized: boolean = false;

  static async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      NetInfo.addEventListener(state => {
        console.log(`[OfflineManager] Zmiana stanu sieci: ${state.isConnected ? 'online' : 'offline'}`);
      });

      this._initialized = true;
    } catch (error) {
      console.error('[OfflineManager] Błąd inicjalizacji:', error);
    }
  }

  static async isOnline(): Promise<boolean> {
    try {
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected ?? false;
      console.log(`[OfflineManager] isOnline: Zwracam ${isConnected} (rzeczywisty stan połączenia)`);
      return isConnected;
    } catch (error) {
      console.error('[OfflineManager] Błąd podczas sprawdzania stanu sieci:', error);
      return false;
    }
  }

  static async saveOfflineExpense(expense: ExpenseBase): Promise<OfflineExpense> {
    try {
      const offlineExpenses = await this.getOfflineExpenses();

      const offlineExpense: OfflineExpense = {
        ...expense,
        local_id: `offline_${new Date().getTime()}_${Math.random().toString(36).substring(2, 15)}`,
        is_synced: false,
        is_offline: true
      };

      offlineExpenses.push(offlineExpense);

      await AsyncStorage.setItem(OFFLINE_EXPENSES_KEY, JSON.stringify(offlineExpenses));

      return offlineExpense;
    } catch (error) {
      console.error('Błąd podczas zapisywania wydatku offline:', error);
      throw error;
    }
  }

  static async getOfflineExpenses(): Promise<OfflineExpense[]> {
    try {
      const offlineExpensesJson = await AsyncStorage.getItem(OFFLINE_EXPENSES_KEY);
      if (!offlineExpensesJson) {
        return [];
      }

      return JSON.parse(offlineExpensesJson);
    } catch (error) {
      console.error('Błąd podczas pobierania wydatków offline:', error);
      return [];
    }
  }

  static async saveCategories(categories: Category[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_CATEGORIES_KEY, JSON.stringify(categories));
      console.log(`[OfflineManager] Zapisano ${categories.length} kategorii offline`);
    } catch (error) {
      console.error('Błąd podczas zapisywania kategorii offline:', error);
      throw error;
    }
  }

  static async getOfflineCategories(): Promise<Category[]> {
    try {
      const categoriesJson = await AsyncStorage.getItem(OFFLINE_CATEGORIES_KEY);
      if (!categoriesJson) {
        return [];
      }
      return JSON.parse(categoriesJson);
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii offline:', error);
      return [];
    }
  }

  static async saveAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      console.log('[OfflineManager] Token zapisany pomyślnie');
    } catch (error) {
      console.error('Błąd podczas zapisywania tokenu:', error);
      throw error;
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Błąd podczas pobierania tokenu:', error);
      return null;
    }
  }

  static async markExpenseAsSynced(localId: string): Promise<void> {
    try {
      const offlineExpenses = await this.getOfflineExpenses();
      const updatedExpenses = offlineExpenses.map(expense => {
        if (expense.local_id === localId) {
          return { ...expense, is_synced: true };
        }
        return expense;
      });

      await AsyncStorage.setItem(OFFLINE_EXPENSES_KEY, JSON.stringify(updatedExpenses));
    } catch (error) {
      console.error('Błąd podczas oznaczania wydatku jako zsynchronizowany:', error);
      throw error;
    }
  }

  static async cleanupSyncedExpenses(): Promise<void> {
    try {
      const offlineExpenses = await this.getOfflineExpenses();
      const notSyncedExpenses = offlineExpenses.filter(expense => !expense.is_synced);

      await AsyncStorage.setItem(OFFLINE_EXPENSES_KEY, JSON.stringify(notSyncedExpenses));
    } catch (error) {
      console.error('Błąd podczas czyszczenia zsynchronizowanych wydatków:', error);
      throw error;
    }
  }

  static async syncOfflineExpenses(): Promise<Expense[]> {
    try {
      const isOnline = await this.isOnline();
      if (!isOnline) {
        throw new Error('Brak połączenia z internetem');
      }

      try {
        const currentUser = await API.getCurrentUser();
        if (!currentUser) {
          throw new Error('Użytkownik nie jest zalogowany');
        }
      } catch (error) {
        throw new Error('Błąd autoryzacji');
      }

      const offlineExpenses = await this.getOfflineExpenses();
      const notSyncedExpenses = offlineExpenses.filter(expense => !expense.is_synced);

      if (notSyncedExpenses.length === 0) {
        return [];
      }

      const syncedExpenses: Expense[] = [];

      for (const offlineExpense of notSyncedExpenses) {
        try {
          const { local_id, is_synced, ...expenseBase } = offlineExpense;

          const syncedExpense = await API.createExpense({
            expense_base: expenseBase
          });

          if (syncedExpense) {
            await this.markExpenseAsSynced(offlineExpense.local_id);
            syncedExpenses.push(syncedExpense);
          }
        } catch (error) {
          console.error(`Błąd podczas synchronizacji wydatku ${offlineExpense.local_id}:`, error);
        }
      }

      await this.cleanupSyncedExpenses();

      return syncedExpenses;
    } catch (error) {
      console.error('Błąd podczas synchronizacji wydatków offline:', error);
      throw error;
    }
  }
}

export default OfflineManager;
