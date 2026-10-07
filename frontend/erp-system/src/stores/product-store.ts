import {
    activateProduct as activateProductRequest,
    createProduct as createProductRequest,
    deactivateProduct as deactivateProductRequest,
    getAllProducts,
    getProductById,
    updateProduct as updateProductRequest,
} from '@/services/product-service';
import { getAllStocks } from '@/services/stock-service';
import {
    Product,
    ProductRequest,
    ProductUpdateRequest,
    StatusFilter,
    StockFilter,
} from '@/types/product';
import { Stock } from '@/types/stock';
import { create } from 'zustand';

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

function mergeProductStocks(products: Product[], stocks: Stock[]): Product[] {
    const stocksByVariant = new Map<string, Stock[]>();

    for (const stock of stocks) {
        const variantStocks = stocksByVariant.get(stock.productVariantId) ?? [];
        variantStocks.push(stock);
        stocksByVariant.set(stock.productVariantId, variantStocks);
    }

    return products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => {
            const variantStocks = stocksByVariant.get(variant.id) ?? [];
            const stockByBranch: Record<string, number> = {};

            for (const stock of variantStocks) {
                stockByBranch[stock.branchId] = stock.quantity;
            }

            return { ...variant, stockByBranch };
        }),
    }));
}

function preserveExistingProductStocks(
    product: Product,
    existingProduct: Product | undefined
): Product {
    if (!existingProduct) {
        return product;
    }

    const existingStocksByVariant = new Map(
        existingProduct.variants.map((variant) => [
            variant.id,
            variant.stockByBranch,
        ])
    );

    return {
        ...product,
        variants: product.variants.map((variant) => ({
            ...variant,
            stockByBranch:
                existingStocksByVariant.get(variant.id) ??
                variant.stockByBranch,
        })),
    };
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
            const [products, stocks] = await Promise.all([
                getAllProducts(token),
                getAllStocks(token),
            ]);
            const productsWithStock = mergeProductStocks(products, stocks);
            set({ products: productsWithStock, isLoading: false });
            return productsWithStock;
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
            const [product, stocks] = await Promise.all([
                getProductById(id, token),
                getAllStocks(token),
            ]);
            const productWithStock = mergeProductStocks([product], stocks)[0];
            set((state) => ({
                products: state.products.some(
                    (item) => item.id === productWithStock.id
                )
                    ? replaceProduct(state.products, productWithStock)
                    : [...state.products, productWithStock],
                isLoading: false,
            }));
            return productWithStock;
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
            const stocks = await getAllStocks(token);
            const productWithStock = mergeProductStocks([product], stocks)[0];
            set((state) => ({
                products: [productWithStock, ...state.products],
                isLoading: false,
            }));
            return productWithStock;
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
            const existingProduct = useProductStore
                .getState()
                .products.find((item) => item.id === product.id);
            const productWithStock = preserveExistingProductStocks(
                product,
                existingProduct
            );
            set((state) => ({
                products: replaceProduct(state.products, productWithStock),
                isLoading: false,
            }));
            return productWithStock;
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
            const existingProduct = useProductStore
                .getState()
                .products.find((item) => item.id === product.id);
            const productWithStock = preserveExistingProductStocks(
                product,
                existingProduct
            );
            set((state) => ({
                products: replaceProduct(state.products, productWithStock),
                isLoading: false,
            }));
            return productWithStock;
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
