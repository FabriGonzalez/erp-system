import { create } from 'zustand';

import {
    adjustStock as adjustStockRequest,
    getAllStocks,
    getStockById,
    getStocksByBranch,
    getStocksByVariant,
} from '@/services/stock-service';
import { Stock, StockAdjustRequest } from '@/types/stock';

type StockState = {
    stocks: Stock[];
    isLoading: boolean;
    error: string | null;
    fetchStocks: (token: string) => Promise<Stock[]>;
    fetchStockById: (id: string, token: string) => Promise<Stock>;
    fetchStocksByBranch: (branchId: string, token: string) => Promise<Stock[]>;
    fetchStocksByVariant: (productVariantId: string, token: string) => Promise<Stock[]>;
    adjustStock: (data: StockAdjustRequest, token: string) => Promise<Stock>;
};

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function replaceStock(stocks: Stock[], stock: Stock) {
    const exists = stocks.some((item) => item.id === stock.id);
    return exists
        ? stocks.map((item) => item.id === stock.id ? stock : item)
        : [...stocks, stock];
}

export const useStockStore = create<StockState>((set) => ({
    stocks: [],
    isLoading: false,
    error: null,

    fetchStocks: async (token) => {
        set({ isLoading: true, error: null });
        try {
            const stocks = await getAllStocks(token);
            set({ stocks, isLoading: false });
            return stocks;
        } catch (error) {
            set({ isLoading: false, error: errorMessage(error, 'No se pudieron obtener los stocks.') });
            throw error;
        }
    },

    fetchStockById: async (id, token) => {
        set({ isLoading: true, error: null });
        try {
            const stock = await getStockById(id, token);
            set((state) => ({ stocks: replaceStock(state.stocks, stock), isLoading: false }));
            return stock;
        } catch (error) {
            set({ isLoading: false, error: errorMessage(error, 'No se pudo obtener el stock.') });
            throw error;
        }
    },

    fetchStocksByBranch: async (branchId, token) => {
        set({ isLoading: true, error: null });
        try {
            const stocks = await getStocksByBranch(branchId, token);
            set({ stocks, isLoading: false });
            return stocks;
        } catch (error) {
            set({ isLoading: false, error: errorMessage(error, 'No se pudieron obtener los stocks de la sucursal.') });
            throw error;
        }
    },

    fetchStocksByVariant: async (productVariantId, token) => {
        set({ isLoading: true, error: null });
        try {
            const stocks = await getStocksByVariant(productVariantId, token);
            set({ stocks, isLoading: false });
            return stocks;
        } catch (error) {
            set({ isLoading: false, error: errorMessage(error, 'No se pudieron obtener los stocks de la variante.') });
            throw error;
        }
    },

    adjustStock: async (data, token) => {
        set({ isLoading: true, error: null });
        try {
            const stock = await adjustStockRequest(data, token);
            set((state) => ({ stocks: replaceStock(state.stocks, stock), isLoading: false }));
            return stock;
        } catch (error) {
            set({ isLoading: false, error: errorMessage(error, 'No se pudo ajustar el stock.') });
            throw error;
        }
    },
}));
