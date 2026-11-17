package com.gonzalez.erp.modules.store.shipping;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Address;

import java.math.BigDecimal;

/**
 * Cuánto cuesta enviar un pedido. El checkout depende solo de esto, así cambiar a tarifas propias
 * o a un correo (Andreani, Correo Argentino, Mercado Envíos) no toca el resto.
 */
public interface ShippingProvider {

    /** Costo en pesos, ya listo para sumar al total. origin es la sucursal que despacha. */
    BigDecimal cost(Company company, Branch origin, Address destination);
}
