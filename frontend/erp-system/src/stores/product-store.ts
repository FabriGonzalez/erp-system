import { create } from 'zustand';
import { Category, Product, StatusFilter, StockFilter } from '@/types/product';
import { mockCategories, mockProducts } from '@/data/mock-products';

type ProductState = {
    products: Product[];
    categories: Category[];
    searchQuery: string;
    stockFilter: StockFilter;
    statusFilter: StatusFilter;
    selectedCategoryId: string | null;
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;

    // Filters & Search Actions
    setSearchQuery: (query: string) => void;
    setStockFilter: (filter: StockFilter) => void;
    setStatusFilter: (filter: StatusFilter) => void;
    setSelectedCategory: (categoryId: string | null) => void;
    resetFilters: () => void;

    // Async & State Simulation
    setLoading: (loading: boolean) => void;
    setError: (error: boolean, message?: string | null) => void;
    reloadProducts: () => void;

    // CRUD Mock Operations
    addProduct: (product: Omit<Product, 'id'>) => string;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    toggleProductActive: (id: string) => void;
};

export const useProductStore = create<ProductState>((set, get) => ({
    products: mockProducts,
    categories: mockCategories,
    searchQuery: '',
    stockFilter: 'ALL',
    statusFilter: 'ALL',
    selectedCategoryId: null,
    isLoading: false,
    isError: false,
    errorMessage: null,

    setSearchQuery: (searchQuery) => set({ searchQuery }),

    setStockFilter: (stockFilter) => set({ stockFilter }),

    setStatusFilter: (statusFilter) => set({ statusFilter }),

    setSelectedCategory: (selectedCategoryId) => set({ selectedCategoryId }),

    resetFilters: () =>
        set({
            searchQuery: '',
            stockFilter: 'ALL',
            statusFilter: 'ALL',
            selectedCategoryId: null,
            isError: false,
            errorMessage: null,
        }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (isError, errorMessage = null) => set({ isError, errorMessage }),

    reloadProducts: () => {
        set({ isLoading: true, isError: false, errorMessage: null });
        setTimeout(() => {
            set({ isLoading: false });
        }, 600);
    },

    addProduct: (newProductData) => {
        const id = `prod-${Date.now()}`;
        const newProduct: Product = {
            ...newProductData,
            id,
            // When created, it starts with an empty branch stock mapping or initialized to 0
            stockByBranch: newProductData.stockByBranch ?? {},
        };

        set((state) => ({
            products: [newProduct, ...state.products],
        }));

        return id;
    },

    updateProduct: (id, updates) => {
        set((state) => ({
            products: state.products.map((prod) =>
                prod.id === id ? { ...prod, ...updates } : prod
            ),
        }));
    },

    toggleProductActive: (id) => {
        set((state) => ({
            products: state.products.map((prod) =>
                prod.id === id ? { ...prod, active: !prod.active } : prod
            ),
        }));
    },
}));
