package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.store.dto.StoreAvailability;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StoreCatalogServiceImplTest {

    @Test
    void availabilityDoesNotExposeTheQuantity() {
        assertThat(StoreCatalogServiceImpl.availabilityOf(-2)).isEqualTo(StoreAvailability.OUT_OF_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(0)).isEqualTo(StoreAvailability.OUT_OF_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(1)).isEqualTo(StoreAvailability.LOW_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(3)).isEqualTo(StoreAvailability.LOW_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(4)).isEqualTo(StoreAvailability.AVAILABLE);
        assertThat(StoreCatalogServiceImpl.availabilityOf(500)).isEqualTo(StoreAvailability.AVAILABLE);
    }
}
