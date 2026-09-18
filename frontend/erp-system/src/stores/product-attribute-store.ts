import { create } from 'zustand';

import { mockAttributes, mockAttributeValues } from '@/data/mock-products';
import { ProductAttribute, ProductAttributeValue } from '@/types/product';

type ProductAttributeState = {
    attributes: ProductAttribute[];
    attributeValues: ProductAttributeValue[];

    // Actions
    addAttribute: (name: string) => ProductAttribute;
    updateAttribute: (id: string, name: string) => void;
    toggleAttributeActive: (id: string) => void;

    addAttributeValue: (attributeId: string, name: string) => ProductAttributeValue;
    updateAttributeValue: (id: string, name: string) => void;
    toggleAttributeValueActive: (id: string) => void;

    // Helpers / Selectors
    getActiveAttributes: () => ProductAttribute[];
    getActiveAttributeValues: (attributeId?: string) => ProductAttributeValue[];
    getAttributeById: (id: string) => ProductAttribute | undefined;
    getAttributeValueById: (id: string) => ProductAttributeValue | undefined;
    getAttributeValuesByAttributeId: (attributeId: string) => ProductAttributeValue[];
};

export const useProductAttributeStore = create<ProductAttributeState>((set, get) => ({
    attributes: mockAttributes,
    attributeValues: mockAttributeValues,

    addAttribute: (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new Error('El nombre del atributo es obligatorio.');
        }

        const normalizedNew = trimmedName.toLowerCase();
        const currentAttributes = get().attributes;

        for (let i = 0; i < currentAttributes.length; i++) {
            if (currentAttributes[i].name.trim().toLowerCase() === normalizedNew) {
                throw new Error('Ya existe un atributo con este nombre.');
            }
        }

        const id = `attr-${Date.now()}`;
        const newAttribute: ProductAttribute = {
            id,
            name: trimmedName,
            active: true,
        };

        set((state) => ({
            attributes: [...state.attributes, newAttribute],
        }));

        return newAttribute;
    },

    updateAttribute: (id: string, name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new Error('El nombre del atributo es obligatorio.');
        }

        const normalizedNew = trimmedName.toLowerCase();
        const currentAttributes = get().attributes;

        for (let i = 0; i < currentAttributes.length; i++) {
            const attr = currentAttributes[i];
            if (attr.id !== id && attr.name.trim().toLowerCase() === normalizedNew) {
                throw new Error('Ya existe un atributo con este nombre.');
            }
        }

        set((state) => ({
            attributes: state.attributes.map((attr) =>
                attr.id === id ? { ...attr, name: trimmedName } : attr
            ),
        }));
    },

    toggleAttributeActive: (id: string) => {
        set((state) => ({
            attributes: state.attributes.map((attr) =>
                attr.id === id ? { ...attr, active: !attr.active } : attr
            ),
        }));
    },

    addAttributeValue: (attributeId: string, name: string) => {
        const trimmedName = name.trim();

        const attribute = get().getAttributeById(attributeId);

        if (!attribute) {
            throw new Error('El atributo especificado no existe.');
        }

        if (!trimmedName) {
            throw new Error('El nombre del valor es obligatorio.');
        }

        if (!attributeId) {
            throw new Error('El valor debe pertenecer a un atributo.');
        }

        const normalizedNew = trimmedName.toLowerCase();
        const currentValues = get().attributeValues;

        for (let i = 0; i < currentValues.length; i++) {
            const val = currentValues[i];
            if (val.attributeId === attributeId && val.name.trim().toLowerCase() === normalizedNew) {
                throw new Error('Ya existe un valor con este nombre para este atributo.');
            }
        }

        const id = `value-${attributeId.replace('attr-', '')}-${Date.now()}`;
        const newValue: ProductAttributeValue = {
            id,
            attributeId,
            name: trimmedName,
            active: true,
        };

        set((state) => ({
            attributeValues: [...state.attributeValues, newValue],
        }));

        return newValue;
    },

    updateAttributeValue: (id: string, name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new Error('El nombre del valor es obligatorio.');
        }

        const currentValue = get().getAttributeValueById(id);
        if (!currentValue) {
            throw new Error('El valor especificado no existe.');
        }

        const normalizedNew = trimmedName.toLowerCase();
        const currentValues = get().attributeValues;

        for (let i = 0; i < currentValues.length; i++) {
            const val = currentValues[i];
            if (
                val.id !== id &&
                val.attributeId === currentValue.attributeId &&
                val.name.trim().toLowerCase() === normalizedNew
            ) {
                throw new Error('Ya existe un valor con este nombre para este atributo.');
            }
        }

        set((state) => ({
            attributeValues: state.attributeValues.map((val) =>
                val.id === id ? { ...val, name: trimmedName } : val
            ),
        }));
    },

    toggleAttributeValueActive: (id: string) => {
        set((state) => ({
            attributeValues: state.attributeValues.map((val) =>
                val.id === id ? { ...val, active: !val.active } : val
            ),
        }));
    },

    getActiveAttributes: () => {
        const result: ProductAttribute[] = [];
        const currentAttributes = get().attributes;
        for (let i = 0; i < currentAttributes.length; i++) {
            if (currentAttributes[i].active) {
                result.push(currentAttributes[i]);
            }
        }
        return result;
    },

    getActiveAttributeValues: (attributeId?: string) => {
        const result: ProductAttributeValue[] = [];
        const currentValues = get().attributeValues;
        for (let i = 0; i < currentValues.length; i++) {
            const val = currentValues[i];
            if (val.active && (!attributeId || val.attributeId === attributeId)) {
                result.push(val);
            }
        }
        return result;
    },

    getAttributeById: (id: string) => {
        const currentAttributes = get().attributes;
        for (let i = 0; i < currentAttributes.length; i++) {
            if (currentAttributes[i].id === id) {
                return currentAttributes[i];
            }
        }
        return undefined;
    },

    getAttributeValueById: (id: string) => {
        const currentValues = get().attributeValues;
        for (let i = 0; i < currentValues.length; i++) {
            if (currentValues[i].id === id) {
                return currentValues[i];
            }
        }
        return undefined;
    },

    getAttributeValuesByAttributeId: (attributeId: string) => {
        const result: ProductAttributeValue[] = [];
        const currentValues = get().attributeValues;
        for (let i = 0; i < currentValues.length; i++) {
            if (currentValues[i].attributeId === attributeId) {
                result.push(currentValues[i]);
            }
        }
        return result;
    },
}));
