export type Category = {
    id: string;
    name: string;
    description?: string;
    active: boolean;
};

export type Product = {
    id: string;
    name: string;
    sku: string;
    price: number;
    categoryId: string;
    categoryName?: string;
    description?: string;
    active: boolean;
    stockByBranch: Record<string, number>;
};

export type ProductFormData = {
    name: string;
    sku: string;
    price: string;
    categoryId: string;
    description?: string;
    active: boolean;
};

export type StockFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
