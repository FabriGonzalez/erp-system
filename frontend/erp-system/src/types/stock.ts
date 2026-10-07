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
