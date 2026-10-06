import { create } from 'zustand';

import {
    activateCategory,
    createCategory,
    deactivateCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
} from '@/services/category-service';
import { Category, CategoryRequest } from '@/types/category';

type CategoryState = {
    categories: Category[];
    isLoading: boolean;
    error: string | null;

    fetchCategories: (token: string) => Promise<Category[]>;
    fetchCategoryById: (id: string, token: string) => Promise<Category>;
    createCategory: (data: CategoryRequest, token: string) => Promise<Category>;
    updateCategory: (
        id: string,
        data: CategoryRequest,
        token: string
    ) => Promise<Category>;
    activateCategory: (id: string, token: string) => Promise<Category>;
    deactivateCategory: (id: string, token: string) => Promise<Category>;
};

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function replaceCategory(categories: Category[], updated: Category): Category[] {
    return categories.map((category) =>
        category.id === updated.id ? updated : category
    );
}

export const useCategoryStore = create<CategoryState>((set) => ({
    categories: [],
    isLoading: false,
    error: null,

    fetchCategories: async (token) => {
        set({ isLoading: true, error: null });
        try {
            const categories = await getAllCategories(token);
            set({ categories, isLoading: false });
            return categories;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al obtener categorías.'
            );
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    fetchCategoryById: async (id, token) => {
        set({ isLoading: true, error: null });
        try {
            const category = await getCategoryById(id, token);
            set((state) => ({
                categories: state.categories.some((item) => item.id === category.id)
                    ? replaceCategory(state.categories, category)
                    : [...state.categories, category],
                isLoading: false,
            }));
            return category;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al obtener la categoría.'
            );
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    createCategory: async (data, token) => {
        set({ isLoading: true, error: null });
        try {
            const category = await createCategory(data, token);
            set((state) => ({
                categories: [...state.categories, category],
                isLoading: false,
            }));
            return category;
        } catch (error: unknown) {
            const message = getErrorMessage(error, 'Error al crear la categoría.');
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    updateCategory: async (id, data, token) => {
        set({ isLoading: true, error: null });
        try {
            const category = await updateCategory(id, data, token);
            set((state) => ({
                categories: replaceCategory(state.categories, category),
                isLoading: false,
            }));
            return category;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al actualizar la categoría.'
            );
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    activateCategory: async (id, token) => {
        set({ isLoading: true, error: null });
        try {
            const category = await activateCategory(id, token);
            set((state) => ({
                categories: replaceCategory(state.categories, category),
                isLoading: false,
            }));
            return category;
        } catch (error: unknown) {
            const message = getErrorMessage(error, 'Error al activar la categoría.');
            set({ error: message, isLoading: false });
            throw error;
        }
    },

    deactivateCategory: async (id, token) => {
        set({ isLoading: true, error: null });
        try {
            const category = await deactivateCategory(id, token);
            set((state) => ({
                categories: replaceCategory(state.categories, category),
                isLoading: false,
            }));
            return category;
        } catch (error: unknown) {
            const message = getErrorMessage(
                error,
                'Error al desactivar la categoría.'
            );
            set({ error: message, isLoading: false });
            throw error;
        }
    },
}));
