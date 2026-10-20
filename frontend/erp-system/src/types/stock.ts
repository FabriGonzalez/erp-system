export type Stock = {
    id: string;
    productId: string;
    productName: string;
    productVariantId: string;
    productVariantSku: string;
    branchId: string;
    branchName: string;
    quantity: number;
    createdAt?: string | null;
    updatedAt?: string | null;
};

/** Filtros del listado paginado de stock; variantIds pide el stock de esas variantes. */
export type StockListParams = {
    branchId?: string;
    q?: string;
    variantIds?: string[];
};

export type StockAdjustRequest = {
    productVariantId: number;
    branchId: number;
    newQuantity: number;
    reason: string;
};

export type StockResponse = {
    id: number | string;
    productId: number | string;
    productName: string;
    productVariantId: number | string;
    productVariantSku: string;
    branchId: number | string;
    branchName: string;
    quantity: number;
    createdAt?: string | null;
    updatedAt?: string | null;
};
