import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    User,
    CategoryBase,
    Category,
    BudgetBase,
    Budget,
    ExpenseBase,
    Expense,
    PagedResponse,
    SignupRequest,
    LoginRequest,
    TokenResponse,
    ExpenseQueryParams,
    PublicExpenseQueryParams,
    BudgetQueryParams,
    ExpenseCreateRequest} from '@/types/types';

// Bazowy URL API
const API_URL = 'http://192.168.0.193:8000';

// Tworzenie instancji axios
const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor do dodawania tokena do żądań
axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Funkcja do obsługi logowania błędów
const handleError = (error: any) => {
    if (error.response) {
        // W przypadku błędu 404, zwracamy pustą wartość
        if (error.response.status === 404) {
            console.log('Zasób nie znaleziony (404):', error.response.data);
            return null;
        }

        console.error('Response error:', error.response.data);
        // Możliwość obsługi błędów autoryzacji, np. przekierowanie do ekranu logowania
        if (error.response.status === 401) {
            // Logika obsługi wygaśnięcia tokenu
        }
    } else if (error.request) {
        console.error('Request error:', error.request);
    } else {
        console.error('Error:', error.message);
    }
    return Promise.reject(error);
};

// Klasa API
export class API {
    // ====== AUTENTYKACJA ======

    /**
     * Rejestracja użytkownika
     */
    static async signup(data: SignupRequest): Promise<User> {
        try {
            const response = await axiosInstance.post('/auth/signup', data);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Logowanie użytkownika
     */
    static async login(data: LoginRequest): Promise<TokenResponse> {
        try {
            // Dla formatu OAuth2PasswordRequestForm wymagany jest Content-Type: application/x-www-form-urlencoded
            const formData = new URLSearchParams();
            formData.append('username', data.username);
            formData.append('password', data.password);

            const response = await axiosInstance.post('/token', formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            // Zapisanie tokenu w AsyncStorage
            await AsyncStorage.setItem('auth_token', response.data.access_token);

            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Wylogowanie użytkownika (tylko po stronie klienta)
     */
    static async logout(): Promise<void> {
        try {
            await AsyncStorage.removeItem('auth_token');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    /**
     * Pobranie aktualnie zalogowanego użytkownika
     */
    static async getCurrentUser(): Promise<User> {
        try {
            const response = await axiosInstance.get('/users/me');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    // ====== KATEGORIE ======

    /**
     * Tworzenie nowej kategorii
     */
    static async createCategory(category: CategoryBase): Promise<Category> {
        try {
            const response = await axiosInstance.post('/users/me/categories', category);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Pobieranie wszystkich kategorii użytkownika
     */
    static async getCategories(offset = 0, limit = 100): Promise<PagedResponse<Category>> {
        try {
            const response = await axiosInstance.get('/users/me/categories', {
                params: { offset, limit }
            });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Tworzenie wielu kategorii offline jednocześnie
     */
    static async createOfflineCategories(categories: CategoryBase[]): Promise<Category[]> {
        try {
            const response = await axiosInstance.post('/users/me/categories/offline', categories);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    // ====== BUDŻETY ======

    /**
     * Ustawianie budżetu dla danego miesiąca
     */
    static async setBudgetForMonth(budget: BudgetBase): Promise<Budget | null> {
        try {
            const response = await axiosInstance.post('/users/me/budgets', budget);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Pobieranie budżetu dla danego miesiąca i roku
     */
    static async getBudgetForMonth(params: BudgetQueryParams): Promise<Budget | null> {
        try {
            const response = await axiosInstance.get('/users/me/budgets', {
                params
            });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Tworzenie wielu budżetów offline jednocześnie
     */
    static async createOfflineBudgets(budgets: BudgetBase[]): Promise<Budget[]> {
        try {
            const response = await axiosInstance.post('/users/me/budgets/offline', budgets);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    // ====== WYDATKI ======

    /**
     * Tworzenie nowego wydatku z opcjonalnym załącznikiem
     */
    static async createExpense(data: ExpenseCreateRequest): Promise<Expense> {
        try {
            const formData = new FormData();

            // Dodawanie danych expense_base jako JSON
            formData.append('expense_base', JSON.stringify(data.expense_base));

            // Dodawanie obrazu, jeśli istnieje
            if (data.image) {
                // W React Native File != File z przeglądarki, więc trzeba dostosować
                // Załóżmy, że data.image ma strukturę { uri, name, type }
                formData.append('image', data.image as unknown as Blob);
            }

            const response = await axiosInstance.post('/users/me/expenses', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Pobieranie wszystkich wydatków użytkownika z opcjonalną filtracją
     */
    static async getExpenses(params?: ExpenseQueryParams): Promise<PagedResponse<Expense>> {
        try {
            const response = await axiosInstance.get('/users/me/expenses', {
                params
            });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Pobieranie pojedynczego wydatku po ID
     */
    static async getExpenseById(expenseId: string): Promise<Expense> {
        try {
            const response = await axiosInstance.get(`/users/me/expenses/${expenseId}`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Udostępnianie wydatku (zmiana na publiczny)
     */
    static async shareExpense(expenseId: string): Promise<Expense> {
        try {
            const response = await axiosInstance.patch(`/users/me/expenses/${expenseId}/share`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Tworzenie wielu wydatków offline jednocześnie
     */
    static async createOfflineExpenses(expenses: ExpenseBase[]): Promise<Expense[]> {
        try {
            const response = await axiosInstance.post('/users/me/expenses/offline', expenses);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Pobieranie publicznych wydatków
     */
    static async getPublicExpenses(params?: PublicExpenseQueryParams): Promise<PagedResponse<Expense>> {
        try {
            const response = await axiosInstance.get('/expenses', {
                params
            });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }
}

export default API;
