package com.gonzalez.erp.modules.customers.entity;

/** De dónde salió la ficha. No cambia nunca: una ficha WEB sigue siendo WEB aunque la edite el ERP. */
public enum CustomerOrigin {
    /** Cargada por un empleado (o importada antes de la tienda). */
    ERP,
    /** Creada por un registro en la tienda web. */
    WEB
}
