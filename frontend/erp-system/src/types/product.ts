export type Category = {
    id: string;
    name: string;
    description?: string;
    active: boolean;
};

export type ProductAttribute = {
    id: string;
    name: string;
    active: boolean;
};

export type ProductAttributeValue = {
    id: string;
    attributeId: string;
    name: string;
    active: boolean;
};

export type ProductVariantAttribute = {
    attributeId: string;
    attributeValueId: string;
};

export type ProductVariant = {
    id: string;
    sku: string;
    price: number;
    attributes: ProductVariantAttribute[];
    stockByBranch: Record<string, number>;
};

export type Product = {
    id: string;
    name: string;
    categoryId: string;
    categoryName?: string;
    description?: string;
    active: boolean;
    variants: ProductVariant[];
};

export type ProductFormData = {
    name: string;
    categoryId: string;
    description?: string;
    active: boolean;
    variants: {
        id?: string;
        sku: string;
        price: string;
        attributes: ProductVariantAttribute[];
        stockByBranch: Record<string, number>;
    }[];
};

export type StockFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
