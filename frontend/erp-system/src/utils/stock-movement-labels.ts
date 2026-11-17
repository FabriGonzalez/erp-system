import { StockMovement, StockMovementReferenceType, StockMovementType } from '@/types/stock-movement';

const TYPE_LABELS: Record<StockMovementType, string> = {
    SALE: 'Venta',
    ADJUSTMENT: 'Ajuste',
    TRANSFER_IN: 'Transferencia recibida',
    TRANSFER_OUT: 'Transferencia enviada',
    RETURN: 'Devolución',
};

const REFERENCE_LABELS: Record<StockMovementReferenceType, string> = {
    ORDER: 'Pedido',
    STOCK_TRANSFER: 'Transferencia',
    PRODUCT_CREATION: 'Alta de producto',
    PRODUCT_UPDATE: 'Edición de producto',
};

/**
 * Título del movimiento. Los cambios hechos desde el producto se guardan como ajuste
 * (el backend no tiene un tipo propio): se muestran con el nombre de la referencia.
 */
export function stockMovementTitle(movement: StockMovement): string {
    if (movement.referenceType === 'PRODUCT_CREATION' || movement.referenceType === 'PRODUCT_UPDATE') {
        return REFERENCE_LABELS[movement.referenceType];
    }
    return TYPE_LABELS[movement.type] ?? movement.type;
}

/**
 * "Transferencia #2". Los pedidos no: el movimiento trae el id interno y en la app se
 * muestran por su número de pedido.
 */
export function stockMovementReference(movement: StockMovement): string | null {
    if (movement.referenceType === 'STOCK_TRANSFER' && movement.referenceId) {
        return `${REFERENCE_LABELS.STOCK_TRANSFER} #${movement.referenceId}`;
    }
    return null;
}

/** "+5" / "−3" / "0". */
export function formatStockDelta(quantity: number): string {
    if (quantity > 0) return `+${quantity}`;
    if (quantity < 0) return `−${Math.abs(quantity)}`;
    return '0';
}
