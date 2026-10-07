export type ProductAttribute = {
    id: string;
    name: string;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductAttributeRequest = {
    name: string;
};

export type ProductAttributeResponse = {
    id: number | string;
    name: string;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductAttributeValue = {
    id: string;
    attributeId: string;
    attributeName?: string;
    name: string;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductAttributeValueRequest = {
    value: string;
};

export type ProductAttributeValueResponse = {
    id: number | string;
    attributeId: number | string;
    attributeName: string;
    value: string;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};
