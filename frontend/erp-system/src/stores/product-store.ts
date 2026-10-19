import {
    activateProduct as activateProductRequest,
    createProduct as createProductRequest,
    deactivateProduct as deactivateProductRequest,
    getAllProducts,
    getProductById,
    updateProduct as updateProductRequest,
} from '@/services/product-service';
import {
    Product,
    ProductRequest,
    ProductUpdateRequest,
    StatusFilter,
    StockFilter,
} from '@/types/product';
import { create } from 'zustand';

// Todas las respuestas de producto del backend traen el stock por sucursal de cada variante,
// así que no hace falta pedir /inventory/stocks aparte ni conservar el stock anterior.

type ProductState = {
    products: Product[];
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

    fetchProducts: (token: string) => Promise<Product[]>;
    fetchProductById: (id: string, token: string) => Promise<Product>;
    createProduct: (data: ProductRequest, token: string) => Promise<Product>;
    updateProductFromApi: (
        id: string,
        data: ProductUpdateRequest,
        token: string
    ) => Promise<Product>;
    activateProduct: (id: string, token: string) => Promise<Product>;
    deactivateProduct: (id: string, token: string) => Promise<Product>;

};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function replaceProduct(products: Product[], updated: Product): Product[] {
    return products.map((product) =>
        product.id === updated.id ? updated : product
    );
}

export const useProductStore = create<ProductState>((set) => ({
    products: [],
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

    fetchProducts: async (token) => {
        set({ isLoading: true, isError: false, errorMessage: null });
        try {
            const products = await getAllProducts(token);
            set({ products, isLoading: false });
            return products;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al obtener los productos.'
            );
            set({ isLoading: false, isError: true, errorMessage: message });
            throw error;
        }
    },

    fetchProductById: async (id, token) => {
        set({ isLoading: true, isError: false, errorMessage: null });
        try {
            const product = await getProductById(id, token);
            set((state) => ({
                products: state.products.some((item) => item.id === product.id)
                    ? replaceProduct(state.products, product)
                    : [...state.products, product],
                isLoading: false,
            }));
            return product;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al obtener el producto.'
            );
            set({ isLoading: false, isError: true, errorMessage: message });
            throw error;
        }
    },

    createProduct: async (data, token) => {
        set({ isLoading: true, isError: false, errorMessage: null });
        try {
            const product = await createProductRequest(data, token);
            set((state) => ({
                products: [product, ...state.products],
                isLoading: false,
            }));
            return product;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al crear el producto.'
            );
            set({ isLoading: false, isError: true, errorMessage: message });
            throw error;
        }
    },

    updateProductFromApi: async (id, data, token) => {
        set({ isLoading: true, isError: false, errorMessage: null });
        try {
            const product = await updateProductRequest(id, data, token);
            set((state) => ({
                products: replaceProduct(state.products, product),
                isLoading: false,
            }));
            return product;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al actualizar el producto.'
            );
            set({ isLoading: false, isError: true, errorMessage: message });
            throw error;
        }
    },

    activateProduct: async (id, token) => {
        set({ isLoading: true, isError: false, errorMessage: null });
        try {
            const product = await activateProductRequest(id, token);
            set((state) => ({
                products: replaceProduct(state.products, product),
                isLoading: false,
            }));
            return product;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al activar el producto.'
            );
            set({ isLoading: false, isError: true, errorMessage: message });
            throw error;
        }
    },

    deactivateProduct: async (id, token) => {
        set({ isLoading: true, isError: false, errorMessage: null });
        try {
            const product = await deactivateProductRequest(id, token);
            set((state) => ({
                products: replaceProduct(state.products, product),
                isLoading: false,
            }));
            return product;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al desactivar el producto.'
            );
            set({ isLoading: false, isError: true, errorMessage: message });
            throw error;
        }
    },

}));
