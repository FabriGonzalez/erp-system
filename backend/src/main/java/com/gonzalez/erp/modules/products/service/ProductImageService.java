package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.modules.products.dto.request.ImageUploadUrlRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductImageOrderRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductImageRequest;
import com.gonzalez.erp.modules.products.dto.response.ImageUploadUrlResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductImageDeleteResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductImageResponse;

import java.util.List;

public interface ProductImageService {

    List<ProductImageResponse> findAll(Long productId);

    ImageUploadUrlResponse createUploadUrl(Long productId, ImageUploadUrlRequest request);

    ProductImageResponse confirm(Long productId, ProductImageRequest request);

    List<ProductImageResponse> reorder(Long productId, ProductImageOrderRequest request);

    ProductImageDeleteResponse delete(Long productId, Long imageId);
}
