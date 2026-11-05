package com.gonzalez.erp.modules.store.dto;

/**
 * El comprador logueado. Solo datos que él mismo cargó: nada de saldo, deuda ni observaciones
 * de la ficha del ERP.
 */
public record StoreMeResponse(
        String firstName,
        String lastName,
        String email,
        String phone,
        boolean emailVerified
) {}
