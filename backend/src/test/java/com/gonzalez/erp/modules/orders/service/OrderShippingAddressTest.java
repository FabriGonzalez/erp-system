package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.orders.dto.request.OrderItemRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderNumberCounter;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import com.gonzalez.erp.modules.orders.exception.InvalidShippingAddressException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.orders.repository.OrderNumberCounterRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.payments.service.OrderPaymentService;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.shipments.entity.Shipment;
import com.gonzalez.erp.modules.shipments.repository.ShipmentRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderShippingAddressTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final Long BRANCH_ID = 10L;
    private static final Long CUSTOMER_ID = 20L;
    private static final Long ADDRESS_ID = 30L;
    private static final Long VARIANT_ID = 40L;
    private static final Long ORDER_ID = 100L;

    @Mock private OrderRepository orderRepository;
    @Mock private OrderNumberCounterRepository orderNumberCounterRepository;
    @Mock private StockRepository stockRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private StockMovementRecorder stockMovementRecorder;
    @Mock private BranchRepository branchRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerAccountService customerAccountService;
    @Mock private PaymentAllocationRepository paymentAllocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private BranchAccessService branchAccessService;
    @Mock private CompanyRepository companyRepository;
    @Mock private OrderPaymentService orderPaymentService;
    @Mock private AddressRepository addressRepository;
    @Mock private ShipmentRepository shipmentRepository;

    @InjectMocks private OrderServiceImpl orderService;

    private Company company;
    private User user;
    private Branch branch;
    private Customer customer;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        user = User.builder()
                .username("vendedor")
                .email("vendedor@acme.com")
                .password("x")
                .firstName("Ven")
                .lastName("Dedor")
                .company(company)
                .build();
        user.setId(USER_ID);
        branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);
        customer = Customer.builder().firstName("Ana").lastName("Pérez").company(company).build();
        customer.setId(CUSTOMER_ID);
        Product product = Product.builder().name("Bombacha").company(company).build();
        product.setId(50L);
        variant = ProductVariant.builder()
                .product(product)
                .sku("BOM-001")
                .price(new BigDecimal("1000"))
                .company(company)
                .build();
        variant.setId(VARIANT_ID);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void quickSaleCannotBeShipped() {
        OrderRequest request = new OrderRequest(BRANCH_ID, CUSTOMER_ID, SalesType.QUICK_SALE,
                new BigDecimal("1000"), DeliveryType.SHIPPING, ADDRESS_ID, null, null, null, null, null);
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);

        assertThatThrownBy(() -> orderService.create(request))
                .isInstanceOf(QuickSaleValidationException.class);
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void createShippingWithoutAddressIsRejected() {
        stubCreateAccess();

        assertThatThrownBy(() -> orderService.create(withProducts(DeliveryType.SHIPPING, null)))
                .isInstanceOf(InvalidShippingAddressException.class);
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void createLocalPickupWithAddressIsRejected() {
        stubCreateAccess();

        assertThatThrownBy(() -> orderService.create(withProducts(DeliveryType.LOCAL_PICKUP, ADDRESS_ID)))
                .isInstanceOf(InvalidShippingAddressException.class);
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void createWithAddressOfAnotherCustomerIsRejected() {
        stubCreateAccess();
        when(addressRepository.findByIdAndCustomerId(ADDRESS_ID, CUSTOMER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.create(withProducts(DeliveryType.SHIPPING, ADDRESS_ID)))
                .isInstanceOf(InvalidShippingAddressException.class);
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void createWithInactiveAddressIsRejected() {
        stubCreateAccess();
        Address address = address(null);
        address.setActive(false);
        when(addressRepository.findByIdAndCustomerId(ADDRESS_ID, CUSTOMER_ID)).thenReturn(Optional.of(address));

        assertThatThrownBy(() -> orderService.create(withProducts(DeliveryType.SHIPPING, ADDRESS_ID)))
                .isInstanceOf(InvalidShippingAddressException.class);
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void createShippingSavesAddressSnapshotWithDefaultCountry() {
        stubCreateAccess();
        when(addressRepository.findByIdAndCustomerId(ADDRESS_ID, CUSTOMER_ID))
                .thenReturn(Optional.of(address(null)));
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(orderNumberCounterRepository.findByCompanyIdForUpdate(COMPANY_ID)).thenReturn(Optional.of(
                OrderNumberCounter.builder().company(company).lastNumber(0L).build()));
        when(branchRepository.getReferenceById(BRANCH_ID)).thenReturn(branch);
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        stubVariantAndStock();
        when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            order.setId(ORDER_ID);
            return order;
        });
        when(shipmentRepository.findByOrderId(ORDER_ID)).thenReturn(Optional.empty());
        when(shipmentRepository.saveAndFlush(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponse response = orderService.create(withProducts(DeliveryType.SHIPPING, ADDRESS_ID));

        ArgumentCaptor<Shipment> saved = ArgumentCaptor.forClass(Shipment.class);
        verify(shipmentRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getOrder().getId()).isEqualTo(ORDER_ID);
        assertThat(saved.getValue().getStreet()).isEqualTo("Corrientes");
        assertThat(saved.getValue().getCountry()).isEqualTo(Shipment.DEFAULT_COUNTRY);
        assertThat(response.shipment()).isNotNull();
        assertThat(response.shipment().city()).isEqualTo("CABA");
    }

    @Test
    void updateCreatesShipmentWhenOrderHadNone() {
        Order order = shippingOrder();
        when(orderRepository.findByIdAndCompanyIdForUpdate(ORDER_ID, COMPANY_ID)).thenReturn(Optional.of(order));
        when(branchAccessService.isAccessible(branch)).thenReturn(true);
        when(customerRepository.findByIdAndCompanyId(CUSTOMER_ID, COMPANY_ID)).thenReturn(Optional.of(customer));
        when(addressRepository.findByIdAndCustomerId(ADDRESS_ID, CUSTOMER_ID))
                .thenReturn(Optional.of(address("Uruguay")));
        stubVariantAndStock();
        when(orderRepository.save(order)).thenReturn(order);
        when(shipmentRepository.findByOrderId(ORDER_ID)).thenReturn(Optional.empty());
        when(shipmentRepository.saveAndFlush(any(Shipment.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderResponse response = orderService.update(ORDER_ID,
                new OrderUpdateRequest(null, List.of(new OrderItemRequest(VARIANT_ID, 1)), ADDRESS_ID, null));

        assertThat(response.shipment()).isNotNull();
        assertThat(response.shipment().street()).isEqualTo("Corrientes");
        assertThat(response.shipment().country()).isEqualTo("Uruguay");
    }

    @Test
    void updateWithInactiveAddressIsRejected() {
        Order order = shippingOrder();
        Address address = address(null);
        address.setActive(false);
        when(orderRepository.findByIdAndCompanyIdForUpdate(ORDER_ID, COMPANY_ID)).thenReturn(Optional.of(order));
        when(branchAccessService.isAccessible(branch)).thenReturn(true);
        when(customerRepository.findByIdAndCompanyId(CUSTOMER_ID, COMPANY_ID)).thenReturn(Optional.of(customer));
        when(addressRepository.findByIdAndCustomerId(ADDRESS_ID, CUSTOMER_ID)).thenReturn(Optional.of(address));

        assertThatThrownBy(() -> orderService.update(ORDER_ID,
                new OrderUpdateRequest(null, List.of(new OrderItemRequest(VARIANT_ID, 1)), ADDRESS_ID, null)))
                .isInstanceOf(InvalidShippingAddressException.class);
        verify(shipmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void shipmentKeepsSnapshotWhenCustomerAddressChanges() {
        Address address = address(null);
        Shipment shipment = Shipment.builder().build();
        shipment.copyAddress(address);

        address.update("Casa", "Otra calle", "1", null, null, "Rosario", null, null, "Chile", null);

        assertThat(shipment.getStreet()).isEqualTo("Corrientes");
        assertThat(shipment.getCity()).isEqualTo("CABA");
        assertThat(shipment.getCountry()).isEqualTo(Shipment.DEFAULT_COUNTRY);
    }

    private void stubCreateAccess() {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);
        when(customerRepository.findByIdAndCompanyId(CUSTOMER_ID, COMPANY_ID)).thenReturn(Optional.of(customer));
    }

    private void stubVariantAndStock() {
        when(productVariantRepository.findByIdWithProductAndCompany(VARIANT_ID)).thenReturn(Optional.of(variant));
        Stock stock = Stock.builder().productVariant(variant).branch(branch).company(company).quantity(10).build();
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, BRANCH_ID, COMPANY_ID))
                .thenReturn(Optional.of(stock));
    }

    private OrderRequest withProducts(DeliveryType deliveryType, Long shippingAddressId) {
        return new OrderRequest(BRANCH_ID, CUSTOMER_ID, SalesType.WITH_PRODUCTS, null, deliveryType,
                shippingAddressId, List.of(new OrderItemRequest(VARIANT_ID, 1)), null, null, null, null);
    }

    private Order shippingOrder() {
        Order order = Order.builder()
                .orderNumber("PED-001")
                .branch(branch)
                .customer(customer)
                .createdBy(user)
                .company(company)
                .status(OrderStatus.TO_PREPARE)
                .salesType(SalesType.WITH_PRODUCTS)
                .deliveryType(DeliveryType.SHIPPING)
                .build();
        order.setId(ORDER_ID);
        order.addItem(OrderItem.builder()
                .productVariant(variant)
                .quantity(1)
                .unitPrice(variant.getPrice())
                .build());
        order.recalculateTotal();
        return order;
    }

    private Address address(String country) {
        Address address = Address.builder()
                .label("Casa")
                .street("Corrientes")
                .number("1234")
                .city("CABA")
                .state("Buenos Aires")
                .country(country)
                .customer(customer)
                .build();
        address.setId(ADDRESS_ID);
        return address;
    }
}
