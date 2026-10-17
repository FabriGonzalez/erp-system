export type StockMovementType = 'SALE' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN';

/** Qué originó el movimiento; null en los ajustes manuales. */
export type StockMovementReferenceType = 'ORDER' | 'STOCK_TRANSFER' | 'PRODUCT_CREATION' | 'PRODUCT_UPDATE';

export type StockMovementResponse = {
    id: number | string;
    stockId: number | string;
    productId: number | string;
    productName: string;
    productVariantId: number | string;
    productVariantSku: string;
    branchId: number | string;
    branchName: string;
    type: StockMovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string | null;
    referenceId: number | string | null;
    referenceType: StockMovementReferenceType | null;
    createdById: number | string | null;
    createdByUsername: string | null;
    createdAt: string;
    updatedAt: string;
};

/** Cambio en la cantidad de un stock (variante en una sucursal). */
export type StockMovement = {
    id: string;
    stockId: string;
    type: StockMovementType;
    /** Delta con signo: negativo si el stock bajó. */
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string | null;
    referenceId: string | null;
    referenceType: StockMovementReferenceType | null;
    /** Null en los movimientos registrados antes de que se guardara el usuario. */
    createdByUsername: string | null;
    createdAt: string;
};
