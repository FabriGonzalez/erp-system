package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerAddressException;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceImplTest {

    private static final Long COMPANY_ID = 1L;

    @Mock private CustomerRepository customerRepository;
    @Mock private AddressRepository addressRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private CustomerAccountService customerAccountService;

    @InjectMocks private CustomerServiceImpl customerService;

    private Company company;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder()
                .username("vendedor")
                .email("vendedor@acme.com")
                .password("x")
                .firstName("Ven")
                .lastName("Dedor")
                .company(company)
                .build();
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createSavesCustomerWithAddressesInOneOperation() {
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        CustomerResponse response = customerService.create(request(List.of(
                address("Casa", "  Corrientes ", false),
                address("Oficina", "Libertador", true))));

        ArgumentCaptor<Customer> saved = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(saved.capture());
        List<Address> addresses = saved.getValue().getAddresses();
        assertThat(addresses).hasSize(2);
        assertThat(addresses.get(0).getStreet()).isEqualTo("Corrientes");
        assertThat(addresses.get(1).isMainAddress()).isTrue();
        assertThat(addresses.get(0).isMainAddress()).isFalse();
        assertThat(response.addressCount()).isEqualTo(2);
        assertThat(response.mainAddress().label()).isEqualTo("Oficina");
        verify(customerAccountService).createAccount(saved.getValue());
    }

    @Test
    void updateRejectsAddresses() {
        CustomerRequest request = request(List.of(address("Casa", "Corrientes", false)));

        assertThatThrownBy(() -> customerService.update(5L, request))
                .isInstanceOf(InvalidCustomerAddressException.class);
        verifyNoInteractions(customerRepository);
    }

    @Test
    void listLoadsAddressesOfTheWholePageInOneQuery() {
        Customer withAddress = customer(10L);
        Customer withoutAddress = customer(11L);
        Address main = Address.builder().label("Casa").street("Corrientes").city("CABA")
                .mainAddress(true).customer(withAddress).build();
        Pageable pageable = PageRequest.of(0, 20);
        when(customerRepository.searchWithoutText(COMPANY_ID, null, pageable))
                .thenReturn(new PageImpl<>(List.of(withAddress, withoutAddress), pageable, 2));
        when(addressRepository.findByCustomerIdInAndActiveTrue(List.of(10L, 11L))).thenReturn(List.of(main));

        PageResponse<CustomerResponse> page = customerService.findAll(null, "  ", pageable);

        verify(addressRepository, times(1)).findByCustomerIdInAndActiveTrue(eq(List.of(10L, 11L)));
        assertThat(page.content()).extracting(CustomerResponse::addressCount).containsExactly(1, 0);
        assertThat(page.content().get(0).mainAddress().label()).isEqualTo("Casa");
        assertThat(page.content().get(1).mainAddress()).isNull();
    }

    @Test
    void searchIsNormalizedToLowercaseWithoutAccents() {
        assertThat(CustomerServiceImpl.normalizeSearch("  María   GARCÍA ")).isEqualTo("maria garcia");
        assertThat(CustomerServiceImpl.normalizeSearch("Muñoz")).isEqualTo("munoz");
        assertThat(CustomerServiceImpl.normalizeSearch("   ")).isNull();
    }

    private Customer customer(Long id) {
        Customer customer = Customer.builder().firstName("Cliente " + id).company(company).build();
        customer.setId(id);
        return customer;
    }

    private CustomerRequest request(List<AddressRequest> addresses) {
        return new CustomerRequest("María", "García", null, null, null, null, null, addresses);
    }

    private AddressRequest address(String label, String street, boolean main) {
        return new AddressRequest(label, street, "100", null, null, "CABA", null, null, null, null, main);
    }
}
