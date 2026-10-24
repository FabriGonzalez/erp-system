package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.orders.dto.request.OrderItemRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import com.gonzalez.erp.modules.orders.repository.OrderNumberCounterRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
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
import static org.mockito.Mockito.when;

/** Al editar un envío, lo que ya estaba conserva el precio con que se vendió. */
@ExtendWith(MockitoExtension.class)
class OrderUpdatePriceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BRANCH_ID = 10L;
    private static final Long CUSTOMER_ID = 20L;
    private static final Long SOLD_VARIANT_ID = 40L;
    private static final Long NEW_VARIANT_ID = 41L;
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
    private Product product;

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
        product = Product.builder().name("Bombacha").company(company).build();
        product.setId(50L);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void existingItemKeepsSoldPriceWhenVariantPriceChanged() {
        ProductVariant sold = variant(SOLD_VARIANT_ID, "1000");
        Order order = orderWith(sold, 1);
        sold.setPrice(new BigDecimal("1500"));
        stubUpdate(order, sold);

        orderService.update(ORDER_ID,
                new OrderUpdateRequest(null, List.of(new OrderItemRequest(SOLD_VARIANT_ID, 3)), null, null));

        assertThat(order.getItems()).singleElement().satisfies(item -> {
            assertThat(item.getQuantity()).isEqualTo(3);
            assertThat(item.getUnitPrice()).isEqualByComparingTo("1000");
        });
        assertThat(order.getTotal()).isEqualByComparingTo("3000");
    }

    @Test
    void addedItemTakesCurrentPrice() {
        ProductVariant sold = variant(SOLD_VARIANT_ID, "1000");
        Order order = orderWith(sold, 1);
        sold.setPrice(new BigDecimal("1500"));
        ProductVariant added = variant(NEW_VARIANT_ID, "500");
        stubUpdate(order, sold, added);

        orderService.update(ORDER_ID, new OrderUpdateRequest(null, List.of(
                new OrderItemRequest(SOLD_VARIANT_ID, 1),
                new OrderItemRequest(NEW_VARIANT_ID, 2)), null, null));

        assertThat(priceOf(order, SOLD_VARIANT_ID)).isEqualByComparingTo("1000");
        assertThat(priceOf(order, NEW_VARIANT_ID)).isEqualByComparingTo("500");
        assertThat(order.getTotal()).isEqualByComparingTo("2000");
    }

    private void stubUpdate(Order order, ProductVariant... variants) {
        when(orderRepository.findByIdAndCompanyIdForUpdate(ORDER_ID, COMPANY_ID)).thenReturn(Optional.of(order));
        when(branchAccessService.isAccessible(branch)).thenReturn(true);
        when(customerRepository.findByIdAndCompanyId(CUSTOMER_ID, COMPANY_ID)).thenReturn(Optional.of(customer));
        when(orderRepository.save(order)).thenReturn(order);
        for (ProductVariant variant : variants) {
            when(productVariantRepository.findByIdWithProductAndCompany(variant.getId()))
                    .thenReturn(Optional.of(variant));
            Stock stock = Stock.builder().productVariant(variant).branch(branch).company(company).quantity(10).build();
            when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(variant.getId(), BRANCH_ID, COMPANY_ID))
                    .thenReturn(Optional.of(stock));
        }
    }

    private ProductVariant variant(Long id, String price) {
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku("SKU-" + id)
                .price(new BigDecimal(price))
                .company(company)
                .build();
        variant.setId(id);
        return variant;
    }

    private Order orderWith(ProductVariant variant, int quantity) {
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
                .quantity(quantity)
                .unitPrice(variant.getPrice())
                .build());
        order.recalculateTotal();
        return order;
    }

    private static BigDecimal priceOf(Order order, Long variantId) {
        return order.getItems().stream()
                .filter(item -> item.getProductVariant().getId().equals(variantId))
                .findFirst()
                .orElseThrow()
                .getUnitPrice();
    }
}
