package com.gonzalez.erp.modules.categories.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.categories.dto.request.CategoryRequest;
import com.gonzalez.erp.modules.categories.dto.response.CategoryResponse;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.exception.CategoryNameAlreadyExistsException;
import com.gonzalez.erp.modules.categories.mapper.CategoryMapper;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    public List<CategoryResponse> findAll(Boolean active) {
        List<Category> categories = (active != null)
                ? categoryRepository.findByActive(active)
                : categoryRepository.findAll();
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
        if (categoryRepository.existsByName(request.name())) {
            throw new CategoryNameAlreadyExistsException(request.name());
        }

        Category category = Category.builder()
                .name(request.name())
                .description(request.description())
                .build();

        Category saved = categoryRepository.save(category);
        return CategoryMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findCategoryOrThrow(id);

        categoryRepository.findByName(request.name())
                .filter(c -> !c.getId().equals(id))
                .ifPresent(c -> {
                    throw new CategoryNameAlreadyExistsException(request.name());
                });

        category.update(
                request.name(),
                request.description()
        );
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
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }
}
