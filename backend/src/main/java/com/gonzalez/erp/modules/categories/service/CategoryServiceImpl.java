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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CompanyRepository companyRepository;

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

    private Category findCategoryOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return categoryRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Category not found with id: " + id));
    }
}
