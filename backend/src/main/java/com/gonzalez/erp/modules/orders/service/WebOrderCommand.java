package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderPromo;

import java.math.BigDecimal;
import java.util.List;

/**
 * Un pedido de la tienda ya validado: la tienda decide qué se compra, a qué precio y desde qué
 * sucursal; el módulo de pedidos lo numera, lo guarda y descuenta el stock.
 *
 * @param reserveStock    falso si ninguna sucursal lo arma sola: se guarda sin descontar stock.
 * @param shippingAddress solo con envío; se copia al envío del pedido.
 */
public record WebOrderCommand(
        Company company,
        Customer customer,
        Branch branch,
        DeliveryType deliveryType,
        boolean reserveStock,
        List<OrderItem> items,
        List<OrderPromo> promos,
        Address shippingAddress,
        BigDecimal shippingCost,
        String checkoutKey
) {}
