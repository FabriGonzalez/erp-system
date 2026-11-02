package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
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
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.orders.repository.OrderNumberCounterRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.payments.service.OrderPaymentService;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.shipments.repository.ShipmentRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Descuento en pesos sobre el pedido entero: el total ya viene descontado y no puede quedar en $0. */
@ExtendWith(MockitoExtension.class)
class OrderDiscountTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BRANCH_ID = 10L;
    private static final Long CUSTOMER_ID = 20L;
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
    private Branch branch;
    private Customer customer;
    private User user;
    private ProductVariant remera;

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
        user.setId(7L);
        branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);
        customer = Customer.builder().firstName("Ana").lastName("Pérez").company(company).build();
        customer.setId(CUSTOMER_ID);
        Product product = Product.builder().name("Remera").company(company).build();
        product.setId(50L);
        remera = ProductVariant.builder()
                .product(product)
                .sku("SKU-40")
                .price(new BigDecimal("14000"))
                .company(company)
                .build();
        remera.setId(VARIANT_ID);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    // --- Alta ---

    @Test
    void walkInSaleChargesTheDiscountedTotal() {
        stubCreate();

        OrderResponse response = orderService.create(walkIn(1, new BigDecimal("4000")));

        assertThat(response.subtotal()).isEqualByComparingTo("14000");
        assertThat(response.discount()).isEqualByComparingTo("4000");
        assertThat(response.total()).isEqualByComparingTo("10000");
        assertThat(response.amountPaid()).isEqualByComparingTo("10000");
    }

    @Test
    void withoutDiscountTheTotalIsTheSubtotal() {
        stubCreate();

        OrderResponse response = orderService.create(walkIn(2, null));

        assertThat(response.discount()).isEqualByComparingTo("0");
        assertThat(response.total()).isEqualByComparingTo("28000");
    }

    @Test
    void discountCannotLeaveTheOrderAtZero() {
        stubCreate();

        assertThatThrownBy(() -> orderService.create(walkIn(1, new BigDecimal("14000"))))
                .isInstanceOf(InvalidOrderException.class);
    }

    @Test
    void discountCannotBeNegative() {
        stubCreate();

        assertThatThrownBy(() -> orderService.create(walkIn(1, new BigDecimal("-100"))))
                .isInstanceOf(InvalidOrderException.class);
    }

    @Test
    void quickSaleCannotHaveADiscount() {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);
        OrderRequest request = new OrderRequest(BRANCH_ID, null, SalesType.QUICK_SALE, new BigDecimal("500"),
                DeliveryType.LOCAL_PICKUP, null, null, new BigDecimal("100"), null, null, null, PaymentMethod.CASH);

        assertThatThrownBy(() -> orderService.create(request)).isInstanceOf(QuickSaleValidationException.class);
    }

    // --- Edición ---

    @Test
    void editingTheDiscountAdjustsTheCustomerAccount() {
        Order order = shipmentWith(1, new BigDecimal("2000"));
        stubUpdate(order);

        OrderResponse response = orderService.update(ORDER_ID, new OrderUpdateRequest(null,
                List.of(new OrderItemRequest(VARIANT_ID, 1)), new BigDecimal("4000"), null, null));

        assertThat(response.total()).isEqualByComparingTo("10000");
        // Antes debía 12000; ahora 10000.
        verify(customerAccountService).applyTransaction(eq(CUSTOMER_ID), eq(COMPANY_ID),
                argThat(amount -> amount.compareTo(new BigDecimal("-2000")) == 0),
                eq(TransactionType.ORDER_CHARGE), eq(branch), anyString());
    }

    @Test
    void editingWithoutDiscountKeepsTheCurrentOne() {
        Order order = shipmentWith(1, new BigDecimal("4000"));
        stubUpdate(order);

        orderService.update(ORDER_ID, new OrderUpdateRequest(null,
                List.of(new OrderItemRequest(VARIANT_ID, 2)), null, null, null));

        assertThat(order.getDiscount()).isEqualByComparingTo("4000");
        assertThat(order.getTotal()).isEqualByComparingTo("24000");
    }

    @Test
    void removingProductsCannotLeaveTheDiscountAboveTheSubtotal() {
        Order order = shipmentWith(2, new BigDecimal("20000"));
        stubUpdate(order);

        assertThatThrownBy(() -> orderService.update(ORDER_ID, new OrderUpdateRequest(null,
                List.of(new OrderItemRequest(VARIANT_ID, 1)), null, null, null)))
                .isInstanceOf(InvalidOrderException.class);
    }

    // --- Ayudas ---

    private OrderRequest walkIn(int quantity, BigDecimal discount) {
        return new OrderRequest(BRANCH_ID, null, SalesType.WITH_PRODUCTS, null, DeliveryType.LOCAL_PICKUP,
                null, List.of(new OrderItemRequest(VARIANT_ID, quantity)), discount, null, null, null,
                PaymentMethod.CASH);
    }

    private void stubCreate() {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        lenient().when(branchRepository.getReferenceById(BRANCH_ID)).thenReturn(branch);
        lenient().when(userRepository.getReferenceById(7L)).thenReturn(user);
        OrderNumberCounter counter = OrderNumberCounter.builder().company(company).lastNumber(0L).build();
        lenient().when(orderNumberCounterRepository.findByCompanyIdForUpdate(COMPANY_ID))
                .thenReturn(Optional.of(counter));
        lenient().when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(ORDER_ID);
            return order;
        });
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        stubVariantAndStock();
    }

    private void stubUpdate(Order order) {
        when(orderRepository.findByIdAndCompanyIdForUpdate(ORDER_ID, COMPANY_ID)).thenReturn(Optional.of(order));
        when(branchAccessService.isAccessible(branch)).thenReturn(true);
        when(customerRepository.findByIdAndCompanyId(CUSTOMER_ID, COMPANY_ID)).thenReturn(Optional.of(customer));
        lenient().when(orderRepository.save(order)).thenReturn(order);
        stubVariantAndStock();
    }

    private void stubVariantAndStock() {
        lenient().when(productVariantRepository.findByIdWithProductAndCompany(VARIANT_ID))
                .thenReturn(Optional.of(remera));
        Stock stock = Stock.builder().productVariant(remera).branch(branch).company(company).quantity(10).build();
        lenient().when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, BRANCH_ID, COMPANY_ID))
                .thenReturn(Optional.of(stock));
    }

    /** Envío del cliente con remeras de $14000 y el descuento dado. */
    private Order shipmentWith(int quantity, BigDecimal discount) {
        Order order = Order.builder()
                .orderNumber("PED-001")
                .branch(branch)
                .customer(customer)
                .createdBy(user)
                .company(company)
                .status(OrderStatus.TO_PREPARE)
                .salesType(SalesType.WITH_PRODUCTS)
                .deliveryType(DeliveryType.SHIPPING)
                .discount(discount)
                .build();
        order.setId(ORDER_ID);
        order.addItem(OrderItem.builder()
                .productVariant(remera)
                .quantity(quantity)
                .unitPrice(remera.getPrice())
                .build());
        order.recalculateTotal();
        return order;
    }
}
