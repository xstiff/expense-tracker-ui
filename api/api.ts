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

const API_URL = 'https://mkrolik-expense-tracker-897427721016.europe-west1.run.app';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

const handleError = (error: any) => {
    if (error.response) {
        if (error.response.status === 404) {
            console.log('Zasób nie znaleziony (404):', error.response.data);
            return null;
        }

        console.error('Response error:', error.response.data);
        if (error.response.status === 401) {
            null;
        }
    } else if (error.request) {
        console.error('Request error:', error.request);
    } else {
        console.error('Error:', error.message);
    }
    return Promise.reject(error);
};

export class API {
    static async signup(data: SignupRequest): Promise<User | null> {
        try {
            const response = await axiosInstance.post('/auth/signup', data);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async login(data: LoginRequest): Promise<TokenResponse | null> {
        try {
            const formData = new URLSearchParams();
            formData.append('username', data.username);
            formData.append('password', data.password);

            const response = await axiosInstance.post('/token', formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            await AsyncStorage.setItem('auth_token', response.data.access_token);

            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async logout(): Promise<void> {
        try {
            await AsyncStorage.removeItem('auth_token');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    static async getCurrentUser(): Promise<User | null> {
        try {
            const response = await axiosInstance.get('/users/me');
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async createCategory(category: CategoryBase): Promise<Category | null> {
        try {
            const response = await axiosInstance.post('/users/me/categories', category);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async getCategories(offset = 0, limit = 100): Promise<PagedResponse<Category> | null> {
        try {
            const response = await axiosInstance.get('/users/me/categories', {
                params: { offset, limit }
            });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async createOfflineCategories(categories: CategoryBase[]): Promise<Category[] | null> {
        try {
            const response = await axiosInstance.post('/users/me/categories/offline', categories);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async setBudgetForMonth(budget: BudgetBase): Promise<Budget | null> {
        try {
            const response = await axiosInstance.post('/users/me/budgets', budget);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

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

    static async createOfflineBudgets(budgets: BudgetBase[]): Promise<Budget[] | null> {
        try {
            const response = await axiosInstance.post('/users/me/budgets/offline', budgets);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async privatizeBudget(budgetId: string): Promise<Budget | null> {
        try {
            const response = await axiosInstance.patch(`/users/me/budgets/${budgetId}/private`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async shareBudget(budgetId: string): Promise<Budget | null> {
        try {
            const response = await axiosInstance.patch(`/users/me/budgets/${budgetId}/share`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async createExpense(data: ExpenseCreateRequest): Promise<Expense | null> {
        try {
            const formData = new FormData();

            formData.append('expense_base', JSON.stringify(data.expense_base));

            if (data.image) {
                const imageFile = {
                    uri: data.image.uri,
                    name: data.image.uri.split('/').pop() || `receipt_${Date.now()}.jpg`,
                    type: 'image/jpeg'
                };

                formData.append('image', imageFile as any);
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

    static async getExpenses(params?: ExpenseQueryParams): Promise<PagedResponse<Expense> | null> {
        try {
            const response = await axiosInstance.get('/users/me/expenses', {
                params
            });
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async getExpenseById(expenseId: string): Promise<Expense | null> {
        try {
            const response = await axiosInstance.get(`/users/me/expenses/${expenseId}`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async shareExpense(expenseId: string): Promise<Expense | null> {
        try {
            const response = await axiosInstance.patch(`/users/me/expenses/${expenseId}/share`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async privatizeExpense(expenseId: string): Promise<Expense | null> {
        try {
            const response = await axiosInstance.patch(`/users/me/expenses/${expenseId}/private`);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async createOfflineExpenses(expenses: ExpenseBase[]): Promise<Expense[] | null> {
        try {
            const response = await axiosInstance.post('/users/me/expenses/offline', expenses);
            return response.data;
        } catch (error) {
            return handleError(error);
        }
    }

    static async getPublicExpenses(params?: PublicExpenseQueryParams): Promise<PagedResponse<Expense> | null> {
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
