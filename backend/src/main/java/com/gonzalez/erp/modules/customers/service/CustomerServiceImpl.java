package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.exception.CustomerDocumentAlreadyExistsException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerDocumentException;
import com.gonzalez.erp.modules.customers.mapper.CustomerMapper;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<CustomerResponse> findAll(Boolean active, String search) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        String normalizedSearch = normalizeSearch(search);

        List<Customer> customers = normalizedSearch == null
                ? customerRepository.searchWithoutText(companyId, active)
                : customerRepository.searchWithText(companyId, active, normalizedSearch);

        return customers.stream()
                .map(CustomerMapper::toResponse)
                .toList();
    }
    
    @Override
    public CustomerResponse findById(Long id) {
        return CustomerMapper.toResponse(findCustomerOrThrow(id));
    }

    @Override
    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        String documentType = normalizeDocumentType(request.documentType());
        String documentNumber = normalizeDocumentNumber(request.documentNumber());
        validateDocumentPair(documentType, documentNumber);

        if (documentType != null
                && customerRepository.existsByCompanyIdAndDocumentTypeAndDocumentNumber(companyId, documentType, documentNumber)) {
            throw new CustomerDocumentAlreadyExistsException(documentType, documentNumber);
        }

        Company company = companyRepository.getReferenceById(companyId);

        Customer customer = Customer.builder()
                .firstName(trim(request.firstName()))
                .lastName(trim(request.lastName()))
                .phone(normalizePhone(request.phone()))
                .email(normalizeEmail(request.email()))
                .documentType(documentType)
                .documentNumber(documentNumber)
                .observations(trim(request.observations()))
                .company(company)
                .build();

        return CustomerMapper.toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = findCustomerOrThrow(id);
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        String documentType = normalizeDocumentType(request.documentType());
        String documentNumber = normalizeDocumentNumber(request.documentNumber());
        validateDocumentPair(documentType, documentNumber);

        if (documentType != null
                && customerRepository.findByCompanyIdAndDocumentTypeAndDocumentNumberAndIdNot(
                        companyId, documentType, documentNumber, id).isPresent()) {
            throw new CustomerDocumentAlreadyExistsException(documentType, documentNumber);
        }

        customer.update(
                trim(request.firstName()),
                trim(request.lastName()),
                trim(request.phone()),
                normalizeEmail(request.email()),
                documentType,
                documentNumber,
                trim(request.observations())
        );

        return CustomerMapper.toResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse deactivate(Long id) {
        Customer customer = findCustomerOrThrow(id);
        customer.deactivate();
        return CustomerMapper.toResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse activate(Long id) {
        Customer customer = findCustomerOrThrow(id);
        customer.activate();
        return CustomerMapper.toResponse(customer);
    }

    private Customer findCustomerOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return customerRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Customer not found with id: " + id));
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeDocumentType(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private String normalizeDocumentNumber(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private String normalizeEmail(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String normalizeSearch(String search) {
        if (search == null) {
            return null;
        }
        String trimmed = search.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateDocumentPair(String documentType, String documentNumber) {
        if ((documentType == null) != (documentNumber == null)) {
            throw new InvalidCustomerDocumentException();
        }
    }

    private String normalizePhone(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.replaceAll("\\s+", " ");
    }
}
