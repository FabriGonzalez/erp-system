package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.store.dto.StoreAddressResponse;

import java.util.List;

/** Direcciones del comprador logueado: la ficha sale siempre del token. */
public interface StoreAddressService {

    /** Solo las activas, con la principal primero. */
    List<StoreAddressResponse> list();

    StoreAddressResponse create(AddressRequest request);

    StoreAddressResponse update(Long addressId, AddressRequest request);

    /** Borrar es desactivar, como en el ERP: un pedido viejo puede seguir apuntando a ella. */
    void delete(Long addressId);
}
