/** Calculado por el backend con su fecha: vigente, todavía no empezó, terminó o desactivada. */
export type PromotionStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
    ACTIVE: 'Vigente',
    SCHEDULED: 'Programada',
    EXPIRED: 'Vencida',
    INACTIVE: 'Inactiva',
};

export type PromotionItemResponse = {
    id: number | string;
    productId: number | string;
    productName: string;
    quantity: number;
    minPrice?: number | string | null;
    maxPrice?: number | string | null;
    available: boolean;
};

export type PromotionResponse = {
    id: number | string;
    name: string;
    description?: string | null;
    price: number | string;
    startDate: string;
    endDate: string;
    active: boolean;
    status: PromotionStatus;
    regularPriceMin: number | string;
    regularPriceMax: number | string;
    items?: PromotionItemResponse[] | null;
    createdAt?: string | null;
    updatedAt?: string | null;
};

/**
 * Un producto de la promo y cuántas unidades lleva; la variante de cada unidad se elige al
 * vender. minPrice y maxPrice: precios actuales de sus variantes activas.
 */
export type PromotionItem = {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    minPrice?: number;
    maxPrice?: number;
    // Producto activo con alguna variante activa: si no, la promo no se puede vender.
    available: boolean;
};

export type Promotion = {
    id: string;
    name: string;
    description?: string;
    price: number;
    // Fechas sin hora (AAAA-MM-DD), inclusive.
    startDate: string;
    endDate: string;
    active: boolean;
    status: PromotionStatus;
    // Lo que costarían los productos sueltos hoy, con las variantes más baratas y más caras.
    regularPriceMin: number;
    regularPriceMax: number;
    items: PromotionItem[];
};

export type PromotionRequest = {
    name: string;
    description?: string | null;
    price: number;
    startDate: string;
    endDate: string;
    items: { productId: number; quantity: number }[];
};

export type PromotionListParams = {
    q?: string;
    status?: PromotionStatus;
};
