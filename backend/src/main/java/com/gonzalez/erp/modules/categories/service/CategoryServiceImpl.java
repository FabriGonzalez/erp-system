package com.gonzalez.erp.modules.categories.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.categories.dto.request.CategoryRequest;
import com.gonzalez.erp.modules.categories.dto.response.CategoryResponse;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.exception.CategoryNameAlreadyExistsException;
import com.gonzalez.erp.modules.categories.mapper.CategoryMapper;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.repository.ProductAttributeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CompanyRepository companyRepository;
    private final ProductAttributeRepository attributeRepository;

    @Override
    public List<CategoryResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Category> categories = (active != null)
                ? categoryRepository.findByCompanyIdAndActive(companyId, active)
                : categoryRepository.findByCompanyId(companyId);
        return categories.stream()
                .map(CategoryMapper::toResponse)
                .toList();
    }

    @Override
    public CategoryResponse findById(Long id) {
        Category category = findCategoryOrThrow(id);
        return CategoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        if (categoryRepository.existsByNameAndCompanyId(request.name(), companyId)) {
            throw new CategoryNameAlreadyExistsException(request.name());
        }

        Company company = companyRepository.getReferenceById(companyId);

        Category category = Category.builder()
                .name(request.name())
                .description(request.description())
                .company(company)
                .build();
        if (request.attributeIds() != null) {
            category.replaceAttributes(findAttributesOrThrow(request.attributeIds(), companyId));
        }

        Category saved = categoryRepository.save(category);
        return CategoryMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findCategoryOrThrow(id);
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        categoryRepository.findByNameAndCompanyId(request.name(), companyId)
                .filter(c -> !c.getId().equals(id))
                .ifPresent(c -> {
                    throw new CategoryNameAlreadyExistsException(request.name());
                });

        category.update(request.name(), request.description());
        if (request.attributeIds() != null) {
            category.replaceAttributes(findAttributesOrThrow(request.attributeIds(), companyId));
        }
        return CategoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse deactivate(Long id) {
        Category category = findCategoryOrThrow(id);
        category.deactivate();
        return CategoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse activate(Long id) {
        Category category = findCategoryOrThrow(id);
        category.activate();
        return CategoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public void addAttributes(Long id, Collection<Long> attributeIds) {
        Category category = findCategoryOrThrow(id);
        category.addAttributes(findAttributesOrThrow(attributeIds, SecurityUtils.requireCurrentCompanyId()));
    }

    private List<ProductAttribute> findAttributesOrThrow(Collection<Long> attributeIds, Long companyId) {
        Set<Long> ids = new HashSet<>(attributeIds);
        if (ids.isEmpty()) {
            return List.of();
        }
        List<ProductAttribute> attributes = attributeRepository.findByIdInAndCompanyId(ids, companyId);
        if (attributes.size() != ids.size()) {
            ids.removeAll(attributes.stream().map(ProductAttribute::getId).toList());
            throw new ResourceNotFoundException("Attribute not found with id: " + ids.iterator().next());
        }
        return attributes;
    }

    private Category findCategoryOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return categoryRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found with id: " + id));
    }
}
