import type { ProductAttributeValueResponse } from '@/types/product-attribute';

export type Category = {
    id: string;
    name: string;
    description?: string;
    active: boolean;
};

export type ProductVariantUpdateRequest = {
    sku: string;
    price: number;
    // Opcional, único por empresa; null lo borra.
    barcode?: string | null;
    attributeValueIds: number[];
    stock: ProductInitialStockRequest[];
};

export type {
    ProductAttribute,
    ProductAttributeRequest,
    ProductAttributeResponse,
    ProductAttributeValue,
    ProductAttributeValueRequest,
    ProductAttributeValueResponse,
} from '@/types/product-attribute';

export type ProductVariantAttribute = {
    attributeId: string;
    attributeValueId: string;
    // Vienen en el producto del backend; las variantes que arma el formulario solo tienen ids.
    attributeName?: string;
    valueName?: string;
};

export type ProductUpdateRequest = {
    name: string;
    description?: string | null;
    categoryId: number;
    variants: ProductVariantUpdateRequest[];
};

export type ProductInitialStockRequest = {
    branchId: number;
    quantity: number;
};

export type ProductVariantRequest = {
    sku: string;
    price: number;
    barcode?: string | null;
    attributeValueIds: number[];
    initialStock?: ProductInitialStockRequest[];
};

export type ProductRequest = {
    name: string;
    description?: string | null;
    categoryId: number;
    variants: ProductVariantRequest[];
};

export type ProductVariantResponse = {
    id: number | string;
    sku: string;
    barcode?: string | null;
    price: number;
    active: boolean;
    attributes: ProductAttributeValueResponse[];
    stock?: ProductInitialStockRequest[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductResponse = {
    id: number | string;
    name: string;
    description?: string | null;
    categoryId: number | string;
    categoryName?: string | null;
    active: boolean;
    variants: ProductVariantResponse[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductVariant = {
    id: string;
    sku: string;
    barcode?: string;
    price: number;
    attributes: ProductVariantAttribute[];
    stockByBranch: Record<string, number>;
    active?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type Product = {
    id: string;
    name: string;
    categoryId: string;
    categoryName?: string;
    description?: string;
    active: boolean;
    variants: ProductVariant[];
    createdAt?: string | null;
    updatedAt?: string | null;
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
        barcode?: string;
        attributes: ProductVariantAttribute[];
        stockByBranch: Record<string, number>;
    }[];
};

export type StockFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

/**
 * Filtros del listado paginado de productos. stock se mide en branchId o, sin sucursal, en el
 * total de la empresa.
 */
export type ProductListParams = {
    q?: string;
    categoryId?: string;
    active?: boolean;
    stock?: Exclude<StockFilter, 'ALL'>;
    branchId?: string;
};

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
