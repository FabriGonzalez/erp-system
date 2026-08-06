package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    @Override
    public List<CustomerResponse> findAll(Boolean active, String search) {
        return customerRepository.search(active, normalizeSearch(search)).stream()
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
        String documentType = normalizeDocumentType(request.documentType());
        String documentNumber = normalizeDocumentNumber(request.documentNumber());
        validateDocumentPair(documentType, documentNumber);

        if (documentType != null
                && customerRepository.existsByDocumentTypeAndDocumentNumber(documentType, documentNumber)) {
            throw new CustomerDocumentAlreadyExistsException(documentType, documentNumber);
        }

        Customer customer = Customer.builder()
                .firstName(trim(request.firstName()))
                .lastName(trim(request.lastName()))
                .phone(normalizePhone(request.phone()))
                .email(normalizeEmail(request.email()))
                .documentType(documentType)
                .documentNumber(documentNumber)
                .observations(trim(request.observations()))
                .build();

        return CustomerMapper.toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = findCustomerOrThrow(id);

        String documentType = normalizeDocumentType(request.documentType());
        String documentNumber = normalizeDocumentNumber(request.documentNumber());
        validateDocumentPair(documentType, documentNumber);

        if (documentType != null
                && customerRepository.findByDocumentTypeAndDocumentNumberAndIdNot(
                        documentType, documentNumber, id).isPresent()) {
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
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
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
