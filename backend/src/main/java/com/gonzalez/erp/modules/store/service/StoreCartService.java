package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartRequest;

public interface StoreCartService {
    StoreCartQuoteResponse quote(StoreCartRequest request);
}
