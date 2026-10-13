package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.exception.CustomerDocumentAlreadyExistsException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerAddressException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerDocumentException;
import com.gonzalez.erp.modules.customers.mapper.AddressMapper;
import com.gonzalez.erp.modules.customers.mapper.CustomerMapper;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final CompanyRepository companyRepository;
    private final CustomerAccountService customerAccountService;

    @Override
    public PageResponse<CustomerResponse> findAll(Boolean active, String search, Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        String normalizedSearch = normalizeSearch(search);

        Page<Customer> customers = normalizedSearch == null
                ? customerRepository.searchWithoutText(companyId, active, pageable)
                : customerRepository.searchWithText(companyId, active, normalizedSearch, pageable);

        // Las direcciones de toda la página en una sola consulta, no una por cliente.
        List<Long> ids = customers.getContent().stream().map(Customer::getId).toList();
        Map<Long, List<Address>> addressesByCustomer = ids.isEmpty()
                ? Map.of()
                : addressRepository.findByCustomerIdInAndActiveTrue(ids).stream()
                        .collect(Collectors.groupingBy(address -> address.getCustomer().getId()));

        return PageResponse.of(customers, customer -> CustomerMapper.toResponse(
                customer, addressesByCustomer.getOrDefault(customer.getId(), List.of())));
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

        // Se guardan en cascada con el cliente, en la misma transacción.
        if (request.hasAddresses()) {
            for (AddressRequest addressRequest : request.addresses()) {
                customer.addAddress(AddressMapper.toEntity(addressRequest), addressRequest.requestsMain());
            }
        }

        Customer savedCustomer = customerRepository.save(customer);
        customerAccountService.createAccount(savedCustomer);

        return CustomerMapper.toResponse(savedCustomer);
    }

    @Override
    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        if (request.hasAddresses()) {
            throw new InvalidCustomerAddressException(
                    "Addresses are managed through /customers/{id}/addresses");
        }
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
                normalizePhone(request.phone()),
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

    /** Minúsculas, sin tildes y con espacios simples: la forma que espera CustomerRepository.searchWithText. */
    static String normalizeSearch(String search) {
        if (search == null) {
            return null;
        }
        String collapsed = search.trim().replaceAll("\\s+", " ");
        if (collapsed.isEmpty()) {
            return null;
        }
        return Normalizer.normalize(collapsed.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
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
