export type StockTransferStatus = 'CONFIRMED' | 'CANCELLED';

export const STOCK_TRANSFER_STATUS_LABELS: Record<StockTransferStatus, string> = {
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Anulada',
};

export type StockTransferRequest = {
    originBranchId: number;
    destinationBranchId: number;
    items: { productVariantId: number; quantity: number }[];
};

export type StockTransferItemResponse = {
    id: number | string;
    productId: number | string;
    productName: string;
    productVariantId: number | string;
    productVariantSku: string;
    quantity: number;
};

export type StockTransferResponse = {
    id: number | string;
    originBranchId: number | string;
    originBranchName: string;
    destinationBranchId: number | string;
    destinationBranchName: string;
    status: StockTransferStatus;
    createdById: number | string;
    createdByUsername: string;
    confirmedAt: string | null;
    items: StockTransferItemResponse[] | null;
    createdAt: string;
    updatedAt: string;
};

export type StockTransferItem = {
    id: string;
    productId: string;
    productName: string;
    variantId: string;
    sku: string;
    quantity: number;
};

/** Transferencia de stock entre sucursales: se confirma al crearla y se puede anular. */
export type StockTransfer = {
    id: string;
    originBranchId: string;
    originBranchName: string;
    destinationBranchId: string;
    destinationBranchName: string;
    status: StockTransferStatus;
    createdByUsername: string;
    createdAt: string;
    items: StockTransferItem[];
    totalUnits: number;
};
