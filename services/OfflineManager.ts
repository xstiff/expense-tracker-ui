import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ExpenseBase, Expense } from '@/types/types';
import { API } from '@/api/api';
import axios from 'axios';

const OFFLINE_EXPENSES_KEY = 'offline_expenses';
const FORCE_OFFLINE_KEY = 'force_offline_mode';

export interface OfflineExpense extends ExpenseBase {
  local_id: string;
  is_synced: boolean;
}

export class OfflineManager {
  private static _forceOfflineMode: boolean = false;
  private static _initialized: boolean = false;

  static async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      const forcedOffline = await AsyncStorage.getItem(FORCE_OFFLINE_KEY);
      if (forcedOffline !== null) {
        this._forceOfflineMode = JSON.parse(forcedOffline);
        console.log(`[OfflineManager] Inicjalizacja: tryb offline = ${this._forceOfflineMode}`);

        if (this._forceOfflineMode) {
          await this.setupNetworkInterceptors();
        }
      }

      NetInfo.addEventListener(state => {
        console.log(`[OfflineManager] Zmiana stanu sieci: ${state.isConnected ? 'online' : 'offline'}`);
      });

      this._initialized = true;
    } catch (error) {
      console.error('[OfflineManager] Błąd inicjalizacji:', error);
    }
  }

  private static async setupNetworkInterceptors(): Promise<void> {
    if (!global.originalAxiosAdapter) {
      global.originalAxiosAdapter = axios.defaults.adapter;
    }

    axios.defaults.adapter = () => {
      console.log("[OfflineManager] 🔴 Blokowanie zapytania axios");
      return Promise.reject({
        message: 'Network request failed - Offline simulator',
        isOfflineSimulator: true
      });
    };

    if (!global.originalFetch) {
      global.originalFetch = global.fetch;
    }

    global.fetch = () => {
      console.log("[OfflineManager] 🔴 Blokowanie zapytania fetch");
      return Promise.reject(new Error('Network request failed - Offline simulator'));
    };

    if (!global.originalXHROpen && global.XMLHttpRequest) {
      global.originalXHROpen = global.XMLHttpRequest.prototype.open;
      global.XMLHttpRequest.prototype.open = function() {
        console.log("[OfflineManager] 🔴 Blokowanie zapytania XMLHttpRequest");
        throw new Error('Network request failed - Offline simulator');
      };
    }

    console.log('[OfflineManager] ✓ Zainstalowano przechwytywacze zapytań sieciowych');
  }

  private static restoreNetworkInterceptors(): void {
    if (global.originalAxiosAdapter) {
      axios.defaults.adapter = global.originalAxiosAdapter;
      global.originalAxiosAdapter = undefined;
    }

    if (global.originalFetch) {
      global.fetch = global.originalFetch;
      global.originalFetch = undefined;
    }

    if (global.originalXHROpen && global.XMLHttpRequest) {
      global.XMLHttpRequest.prototype.open = global.originalXHROpen;
      global.originalXHROpen = undefined;
    }

    console.log('[OfflineManager] ✓ Przywrócono normalne działanie sieci');
  }

  static async setForceOfflineMode(value: boolean): Promise<void> {
    try {
      if (!this._initialized) {
        await this.initialize();
      }

      this._forceOfflineMode = value;
      await AsyncStorage.setItem(FORCE_OFFLINE_KEY, JSON.stringify(value));
      console.log(`[OfflineManager] Ustawiono wymuszony tryb offline: ${value}`);

      if (value) {
        await this.setupNetworkInterceptors();
      } else {
        this.restoreNetworkInterceptors();
      }
    } catch (error) {
      console.error('[OfflineManager] Błąd podczas ustawiania wymuszonego trybu offline:', error);
    }
  }

  static async isOnline(): Promise<boolean> {
    try {
      if (this._forceOfflineMode) {
        console.log("[OfflineManager] isOnline: Zwracam false (wymuszony tryb offline)");
        return false;
      }

      const forcedOffline = await AsyncStorage.getItem(FORCE_OFFLINE_KEY);
      if (forcedOffline !== null && JSON.parse(forcedOffline) === true) {
        this._forceOfflineMode = true;
        console.log("[OfflineManager] isOnline: Zwracam false (wczytany wymuszony tryb offline)");
        return false;
      }

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
