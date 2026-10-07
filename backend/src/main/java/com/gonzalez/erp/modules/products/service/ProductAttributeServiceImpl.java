package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeValueRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.exception.ProductAttributeNameAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductAttributeValueAlreadyExistsException;
import com.gonzalez.erp.modules.products.mapper.ProductAttributeMapper;
import com.gonzalez.erp.modules.products.repository.ProductAttributeRepository;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductAttributeServiceImpl implements ProductAttributeService {

    private final ProductAttributeRepository attributeRepository;
    private final ProductAttributeValueRepository attributeValueRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<ProductAttributeResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<ProductAttribute> attributes = (active != null)
                ? attributeRepository.findByCompanyIdAndActive(companyId, active)
                : attributeRepository.findByCompanyId(companyId);
        return attributes.stream()
                .map(ProductAttributeMapper::toResponse)
                .toList();
    }

    @Override
    public ProductAttributeResponse findById(Long id) {
        ProductAttribute attribute = findAttributeOrThrow(id);
        return ProductAttributeMapper.toResponse(attribute);
    }

    @Override
    public List<ProductAttributeValueResponse> findValues(Long attributeId) {
        findAttributeOrThrow(attributeId);
        return attributeValueRepository.findByAttributeId(attributeId).stream()
                .map(this::toValueResponse)
                .toList();
    }

    @Override
    @Transactional
    public ProductAttributeResponse create(ProductAttributeRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        if (attributeRepository.existsByNameAndCompanyId(request.name(), companyId)) {
            throw new ProductAttributeNameAlreadyExistsException(request.name());
        }

        Company company = companyRepository.getReferenceById(companyId);

        ProductAttribute attribute = ProductAttribute.builder()
                .name(request.name())
                .company(company)
                .build();

        ProductAttribute saved = attributeRepository.saveAndFlush(attribute);
        return ProductAttributeMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ProductAttributeResponse update(Long id, ProductAttributeRequest request) {
        ProductAttribute attribute = findAttributeOrThrow(id);

        Long companyId = SecurityUtils.requireCurrentCompanyId();
        if (attributeRepository.existsByNameAndCompanyIdAndIdNot(request.name(), companyId, id)) {
            throw new ProductAttributeNameAlreadyExistsException(request.name());
        }

        attribute.update(request.name());
        return ProductAttributeMapper.toResponse(attribute);
    }

    @Override
    @Transactional
    public ProductAttributeResponse deactivate(Long id) {
        ProductAttribute attribute = findAttributeOrThrow(id);
        attribute.deactivate();
        return ProductAttributeMapper.toResponse(attribute);
    }

    @Override
    @Transactional
    public ProductAttributeResponse activate(Long id) {
        ProductAttribute attribute = findAttributeOrThrow(id);
        attribute.activate();
        return ProductAttributeMapper.toResponse(attribute);
    }

    @Override
    @Transactional
    public ProductAttributeValueResponse addValue(Long attributeId, ProductAttributeValueRequest request) {
        ProductAttribute attribute = findAttributeOrThrow(attributeId);

        if (attributeValueRepository.existsByAttributeIdAndValue(attributeId, request.value())) {
            throw new ProductAttributeValueAlreadyExistsException(request.value(), attribute.getName());
        }

        ProductAttributeValue attributeValue = ProductAttributeValue.builder()
                .attribute(attribute)
                .value(request.value())
                .build();

        ProductAttributeValue saved = attributeValueRepository.saveAndFlush(attributeValue);
        return toValueResponse(saved);
    }

    @Override
    @Transactional
    public ProductAttributeValueResponse updateValue(Long valueId, ProductAttributeValueRequest request) {
        ProductAttributeValue attributeValue = findValueOrThrow(valueId);

        if (attributeValueRepository.existsByAttributeIdAndValueAndIdNot(
                attributeValue.getAttribute().getId(), request.value(), valueId)) {
            throw new ProductAttributeValueAlreadyExistsException(
                    request.value(), attributeValue.getAttribute().getName());
        }

        attributeValue.update(request.value());
        return toValueResponse(attributeValue);
    }

    @Override
    @Transactional
    public ProductAttributeValueResponse deactivateValue(Long valueId) {
        ProductAttributeValue attributeValue = findValueOrThrow(valueId);
        attributeValue.deactivate();
        return toValueResponse(attributeValue);
    }

    @Override
    @Transactional
    public ProductAttributeValueResponse activateValue(Long valueId) {
        ProductAttributeValue attributeValue = findValueOrThrow(valueId);
        attributeValue.activate();
        return toValueResponse(attributeValue);
    }

    private ProductAttribute findAttributeOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return attributeRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Attribute not found with id: " + id));
    }

    private ProductAttributeValue findValueOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return attributeValueRepository.findByIdAndAttributeCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Attribute value not found with id: " + id));
    }

    private ProductAttributeValueResponse toValueResponse(ProductAttributeValue value) {
        return new ProductAttributeValueResponse(
                value.getId(),
                value.getAttribute().getId(),
                value.getAttribute().getName(),
                value.getValue(),
                value.isActive(),
                value.getCreatedAt(),
                value.getUpdatedAt()
        );
    }
}
