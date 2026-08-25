package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
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
    private final CompanyRepository companyRepository;

    @Override
    public List<ProductResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Product> products = (active != null)
                ? productRepository.findByCompanyIdAndActive(companyId, active)
                : productRepository.findByCompanyId(companyId);
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
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        if (productRepository.existsBySkuAndCompanyId(request.sku(), companyId)) {
            throw new ProductSkuAlreadyExistsException(request.sku());
        }

        Category category = findCategoryOrThrow(request.categoryId());
        checkCategoryActive(category);

        Company company = companyRepository.getReferenceById(companyId);

        Product product = Product.builder()
                .sku(request.sku())
                .name(request.name())
                .color(request.color())
                .talle(request.talle())
                .description(request.description())
                .price(request.price())
                .category(category)
                .company(company)
                .build();

        Product saved = productRepository.saveAndFlush(product);
        return ProductMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        Product product = findProductOrThrow(id);

        Long companyId = SecurityUtils.requireCurrentCompanyId();
        if (productRepository.existsBySkuAndCompanyIdAndIdNot(request.sku(), companyId, id)) {
            throw new ProductSkuAlreadyExistsException(request.sku());
        }

        Category category = findCategoryOrThrow(request.categoryId());
        checkCategoryActive(category);

        product.update(
                request.name(),
                request.color(),
                request.talle(),
                request.description(),
                request.price(),
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
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return productRepository.findById(id)
                .filter(product -> product.getCompany() != null
                        && companyId.equals(product.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException("Product not found with id: " + id));
    }

    private Category findCategoryOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return categoryRepository.findById(id)
                .filter(category -> category.getCompany() != null
                        && companyId.equals(category.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found with id: " + id));
    }

    private void checkCategoryActive(Category category) {
        if (!category.isActive()) {
            throw new ProductCategoryNotActiveException(category.getName());
        }
    }
}
