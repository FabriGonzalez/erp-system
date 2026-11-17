package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;

import java.util.List;
import java.util.Map;

/**
 * El carrito evaluado: lo que ve el comprador (quote) y las entidades con que el checkout arma el
 * pedido, para no volver a buscarlas ni repetir las reglas.
 *
 * @param storeBranches sucursales que venden por la web, por prioridad (vacía si no se puede comprar).
 */
public record StoreCartEvaluation(
        StoreCartQuoteResponse quote,
        Map<Long, ProductVariant> variants,
        Map<Long, Promotion> promotions,
        List<Branch> storeBranches
) {}
