import { create } from 'zustand';

import {
    activateAttribute,
    activateAttributeValue,
    createAttribute,
    createAttributeValue,
    deactivateAttribute,
    deactivateAttributeValue,
    getAllAttributes,
    getAttributeById as getAttributeByIdFromApi,
    getAttributeValues,
    updateAttribute,
    updateAttributeValue,
} from '@/services/product-attribute-service';
import {
    ProductAttribute,
    ProductAttributeRequest,
    ProductAttributeValue,
    ProductAttributeValueRequest,
} from '@/types/product-attribute';

type ProductAttributeState = {
    attributes: ProductAttribute[];
    attributeValues: ProductAttributeValue[];
    isLoading: boolean;
    error: string | null;
    fetchAttributes: (token: string) => Promise<void>;
    fetchAttributeById: (id: string, token: string) => Promise<ProductAttribute>;
    createAttribute: (data: ProductAttributeRequest, token: string) => Promise<ProductAttribute>;
    updateAttribute: (id: string, data: ProductAttributeRequest, token: string) => Promise<ProductAttribute>;
    activateAttribute: (id: string, token: string) => Promise<ProductAttribute>;
    deactivateAttribute: (id: string, token: string) => Promise<ProductAttribute>;
    createAttributeValue: (attributeId: string, data: ProductAttributeValueRequest, token: string) => Promise<ProductAttributeValue>;
    updateAttributeValue: (id: string, data: ProductAttributeValueRequest, token: string) => Promise<ProductAttributeValue>;
    activateAttributeValue: (id: string, token: string) => Promise<ProductAttributeValue>;
    deactivateAttributeValue: (id: string, token: string) => Promise<ProductAttributeValue>;
    getActiveAttributes: () => ProductAttribute[];
    getActiveAttributeValues: (attributeId?: string) => ProductAttributeValue[];
    getAttributeById: (id: string) => ProductAttribute | undefined;
    getAttributeValueById: (id: string) => ProductAttributeValue | undefined;
    getAttributeValuesByAttributeId: (attributeId: string) => ProductAttributeValue[];
};

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
    const exists = items.some((current) => current.id === item.id);
    return exists ? items.map((current) => current.id === item.id ? item : current) : [...items, item];
}

export const useProductAttributeStore = create<ProductAttributeState>((set, get) => ({
    attributes: [],
    attributeValues: [],
    isLoading: false,
    error: null,

    fetchAttributes: async (token) => {
        set({ isLoading: true, error: null });
        try {
            const attributes = await getAllAttributes(token);
            const values = (await Promise.all(
                attributes.map((attribute) => getAttributeValues(attribute.id, token))
            )).flat();
            set({ attributes, attributeValues: values, isLoading: false });
        } catch (error) {
            set({ isLoading: false, error: error instanceof Error ? error.message : 'No se pudieron cargar los atributos.' });
            throw error;
        }
    },

    fetchAttributeById: async (id, token) => {
        set({ isLoading: true, error: null });
        try {
            const [attribute, values] = await Promise.all([
                getAttributeByIdFromApi(id, token),
                getAttributeValues(id, token),
            ]);
            set((state) => ({
                attributes: replaceById(state.attributes, attribute),
                attributeValues: [
                    ...state.attributeValues.filter((value) => value.attributeId !== id),
                    ...values,
                ],
                isLoading: false,
            }));
            return attribute;
        } catch (error) {
            set({ isLoading: false, error: error instanceof Error ? error.message : 'No se pudo cargar el atributo.' });
            throw error;
        }
    },

    createAttribute: async (data, token) => {
        const attribute = await createAttribute(data, token);
        set((state) => ({ attributes: replaceById(state.attributes, attribute), error: null }));
        return attribute;
    },
    updateAttribute: async (id, data, token) => {
        const attribute = await updateAttribute(id, data, token);
        set((state) => ({ attributes: replaceById(state.attributes, attribute), error: null }));
        return attribute;
    },
    activateAttribute: async (id, token) => {
        const attribute = await activateAttribute(id, token);
        set((state) => ({ attributes: replaceById(state.attributes, attribute), error: null }));
        return attribute;
    },
    deactivateAttribute: async (id, token) => {
        const attribute = await deactivateAttribute(id, token);
        set((state) => ({ attributes: replaceById(state.attributes, attribute), error: null }));
        return attribute;
    },
    createAttributeValue: async (attributeId, data, token) => {
        const value = await createAttributeValue(attributeId, data, token);
        set((state) => ({ attributeValues: replaceById(state.attributeValues, value), error: null }));
        return value;
    },
    updateAttributeValue: async (id, data, token) => {
        const value = await updateAttributeValue(id, data, token);
        set((state) => ({ attributeValues: replaceById(state.attributeValues, value), error: null }));
        return value;
    },
    activateAttributeValue: async (id, token) => {
        const value = await activateAttributeValue(id, token);
        set((state) => ({ attributeValues: replaceById(state.attributeValues, value), error: null }));
        return value;
    },
    deactivateAttributeValue: async (id, token) => {
        const value = await deactivateAttributeValue(id, token);
        set((state) => ({ attributeValues: replaceById(state.attributeValues, value), error: null }));
        return value;
    },

    getActiveAttributes: () => get().attributes.filter((attribute) => attribute.active),
    getActiveAttributeValues: (attributeId) => get().attributeValues.filter(
        (value) => value.active && (!attributeId || value.attributeId === attributeId)
    ),
    getAttributeById: (id) => get().attributes.find((attribute) => attribute.id === id),
    getAttributeValueById: (id) => get().attributeValues.find((value) => value.id === id),
    getAttributeValuesByAttributeId: (attributeId) => get().attributeValues.filter(
        (value) => value.attributeId === attributeId
    ),
}));
