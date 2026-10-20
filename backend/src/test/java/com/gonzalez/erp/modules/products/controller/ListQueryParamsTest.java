package com.gonzalez.erp.modules.products.controller;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.config.GlobalExceptionHandler;
import com.gonzalez.erp.modules.inventory.controller.StockController;
import com.gonzalez.erp.modules.inventory.service.StockService;
import com.gonzalez.erp.modules.products.dto.request.ProductSearchCriteria;
import com.gonzalez.erp.modules.products.dto.request.ProductStockFilter;
import com.gonzalez.erp.modules.products.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Parámetros de los listados paginados de productos y de stock. */
@ExtendWith(MockitoExtension.class)
class ListQueryParamsTest {

    @Mock private ProductService productService;
    @Mock private StockService stockService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ProductController(productService), new StockController(stockService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void productsDefaultToTwentyByNameWithIdAsTieBreaker() throws Exception {
        when(productService.findAll(any(), any())).thenReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(productService).findAll(eq(new ProductSearchCriteria(null, null, null, null, null)), pageable.capture());
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by("name").and(Sort.by("id")));
    }

    @Test
    void productFiltersReachTheService() throws Exception {
        when(productService.findAll(any(), any())).thenReturn(new PageResponse<>(List.of(), 1, 50, 0, 0));

        mockMvc.perform(get("/api/v1/products")
                        .param("active", "true")
                        .param("categoryId", "3")
                        .param("q", "remera")
                        .param("stock", "IN_STOCK")
                        .param("branchId", "10")
                        .param("page", "1")
                        .param("size", "50")
                        .param("sort", "createdAt,desc"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(productService).findAll(
                eq(new ProductSearchCriteria(true, 3L, "remera", ProductStockFilter.IN_STOCK, 10L)),
                pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
    }

    @Test
    void productPageSizeAboveTheLimitIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/products").param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PRODUCT_QUERY"));
        verify(productService, never()).findAll(any(), any());
    }

    @Test
    void productUnknownSortFieldIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/products").param("sort", "price,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PRODUCT_QUERY"));
    }

    @Test
    void stocksAcceptAListOfVariantIds() throws Exception {
        when(stockService.search(any(), any(), any(), any())).thenReturn(new PageResponse<>(List.of(), 0, 100, 0, 0));

        mockMvc.perform(get("/api/v1/inventory/stocks")
                        .param("branchId", "10")
                        .param("variantIds", "40,41")
                        .param("size", "100"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(stockService).search(eq(10L), isNull(), eq(List.of(40L, 41L)), pageable.capture());
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by("productVariant.product.name", "productVariant.sku", "id"));
    }

    @Test
    void stockPageSizeOfZeroIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/stocks").param("size", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_STOCK_QUERY"));
        verify(stockService, never()).search(any(), any(), any(), any());
    }
}
