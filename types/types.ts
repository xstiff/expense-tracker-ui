// Podstawowe typy używane w całej aplikacji
export type UUID = string;

// Interfejsy dotyczące użytkownika
export interface UserBase {
    username: string;
    email: string;
    full_name: string;
    disabled: boolean;
}

export interface User extends UserBase {
    hashed_password: string;
}

// Interfejsy dotyczące kategorii
export interface CategoryBase {
    name: string;
    is_offline: boolean;
}

export interface Category extends CategoryBase {
    id: UUID;
    owner: string | null;
}

// Interfejsy dotyczące budżetu
export interface BudgetBase {
    year: number;
    month: number; // 1-12
    max_budget: number;
    is_offline: boolean;
}

export interface Budget extends BudgetBase {
    id: UUID;
    remaining_budget: number;
    owner: string | null;
}

// Interfejsy dotyczące wydatków
export interface ExpenseBase {
    name: string;
    amount: number;
    category_id: UUID;
    is_offline: boolean;
    is_public: boolean;
    timestamp: string; // Format daty: YYYY-MM-DD
}

export interface Expense extends ExpenseBase {
    id: UUID;
    owner: string | null;
    image_url: string | null;
}

// Interfejs dla obrazów z expo-image-picker
export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    type?: string;
    fileName?: string;
    fileSize?: number;
    exif?: Record<string, any>;
}

// Interfejs do tworzenia wydatków z załącznikiem
export interface ExpenseCreateRequest {
    expense_base: ExpenseBase;
    image?: ImagePickerAsset; // Zaktualizowany typ dla obrazów z expo-image-picker
}

// Interfejs odpowiedzi paginowanej
export interface PagedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}

// Interfejsy dotyczące autoryzacji i tokenów
export interface SignupRequest {
    user_base: UserBase;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

// Interfejsy dla zapytań parametrów
export interface ExpenseQueryParams {
    category_id?: UUID;
    name_query?: string;
    offset?: number;
    limit?: number;
}

export interface PublicExpenseQueryParams {
    category_id?: UUID;
    query?: string; // zapytanie po nazwie wydatku lub nazwie użytkownika
    offset?: number;
    limit?: number;
}

export interface BudgetQueryParams {
    year: number;
    month: number;
}

// Odpowiedzi API

// GET /users/me
export type GetCurrentUserResponse = User;

// POST /users/me/categories
export type CreateCategoryResponse = Category;

// GET /users/me/categories
export type GetCategoriesResponse = PagedResponse<Category>;

// POST /users/me/categories/offline
export type CreateOfflineCategoriesResponse = Category[];

// POST /users/me/budgets/offline
export type SetOfflineBudgetsResponse = Budget[];

// POST /users/me/budgets
export type SetBudgetForMonthResponse = Budget | null;

// GET /users/me/budgets
export type GetBudgetForMonthResponse = Budget | null;

// POST /users/me/expenses
export type SaveExpenseResponse = Expense;

// GET /users/me/expenses
export type GetExpensesResponse = PagedResponse<Expense>;

// GET /users/me/expenses/{expense_id}
export type GetExpenseByIdResponse = Expense;

// PATCH /users/me/expenses/{expense_id}/share
export type ShareExpenseResponse = Expense;

// POST /users/me/expenses/offline
export type SaveOfflineExpensesResponse = Expense[];

// POST /auth/signup
export type SignupResponse = User;

// POST /token
export type LoginResponse = TokenResponse;

// GET /expenses (publiczne)
export type GetPublicExpensesResponse = PagedResponse<Expense>;
