import { mockAttributeValues, mockAttributes, mockCategories, mockProducts } from '@/data/mock-products';
import {
    Category,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    StatusFilter,
    StockFilter,
} from '@/types/product';
import { create } from 'zustand';

type ProductState = {
    products: Product[];
    categories: Category[];
    attributes: ProductAttribute[];
    attributeValues: ProductAttributeValue[];
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
    attributes: mockAttributes,
    attributeValues: mockAttributeValues,
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
