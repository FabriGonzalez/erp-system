package com.gonzalez.erp.modules.promotions.entity;

/** Estado calculado con la fecha del servidor; no se guarda. */
public enum PromotionStatus {
    /** Activa y con la fecha de hoy entre desde y hasta, inclusive: se puede vender. */
    ACTIVE,
    /** Activa, todavía no empezó. */
    SCHEDULED,
    /** Activa, ya terminó. */
    EXPIRED,
    /** Desactivada a mano, sin importar las fechas. */
    INACTIVE
}
