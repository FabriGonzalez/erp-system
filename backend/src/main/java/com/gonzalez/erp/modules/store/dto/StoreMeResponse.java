package com.gonzalez.erp.modules.store.dto;

/**
 * El comprador logueado. Solo datos que él mismo cargó: nada de saldo, deuda ni observaciones
 * de la ficha del ERP. Sin contraseña (cuenta de Google) el sitio no ofrece cambiarla.
 */
public record StoreMeResponse(
        String firstName,
        String lastName,
        String email,
        String phone,
        boolean emailVerified,
        boolean hasPassword
) {}
