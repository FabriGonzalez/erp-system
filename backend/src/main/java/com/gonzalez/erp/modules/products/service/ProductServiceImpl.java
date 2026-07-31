package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.exception.ProductCategoryNotActiveException;
import com.gonzalez.erp.modules.products.exception.ProductSkuAlreadyExistsException;
import com.gonzalez.erp.modules.products.mapper.ProductMapper;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Override
    public List<ProductResponse> findAll(Boolean active) {
        List<Product> products = (active != null)
                ? productRepository.findByActive(active)
                : productRepository.findAll();
        return products.stream()
                .map(ProductMapper::toResponse)
                .toList();
    }

    @Override
    public ProductResponse findById(Long id) {
        Product product = findProductOrThrow(id);
        return ProductMapper.toResponse(product);
    }

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw new ProductSkuAlreadyExistsException(request.sku());
        }

        Category category = findCategoryOrThrow(request.categoryId());
        checkCategoryActive(category);

        Product product = Product.builder()
                .name(request.name())
                .sku(request.sku())
                .description(request.description())
                .category(category)
                .build();

        Product saved = productRepository.save(product);
        return ProductMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        Product product = findProductOrThrow(id);

        Category category = findCategoryOrThrow(request.categoryId());
        checkCategoryActive(category);

        product.update(
                request.name(),
                request.description(),
                category
        );
        return ProductMapper.toResponse(product);
    }

    @Override
    @Transactional
    public ProductResponse deactivate(Long id) {
        Product product = findProductOrThrow(id);
        product.deactivate();
        return ProductMapper.toResponse(product);
    }

    @Override
    @Transactional
    public ProductResponse activate(Long id) {
        Product product = findProductOrThrow(id);
        product.activate();
        return ProductMapper.toResponse(product);
    }

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private Category findCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }

    private void checkCategoryActive(Category category) {
        if (!category.isActive()) {
            throw new ProductCategoryNotActiveException(category.getName());
        }
    }
}
