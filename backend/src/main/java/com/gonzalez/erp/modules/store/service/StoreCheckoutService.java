package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.store.dto.StoreCheckoutRequest;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutResponse;

public interface StoreCheckoutService {
    StoreCheckoutResponse checkout(StoreCheckoutRequest request);
}
