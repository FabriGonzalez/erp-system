package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.orders.dto.request.OrderItemRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderPromoRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderPromoRequest.PromoVariantRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderNumberCounter;
import com.gonzalez.erp.modules.orders.entity.OrderPromo;
import com.gonzalez.erp.modules.orders.entity.OrderPromoComponent;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import com.gonzalez.erp.modules.orders.exception.InsufficientStockForEditException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.orders.repository.OrderNumberCounterRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.payments.service.OrderPaymentService;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import com.gonzalez.erp.modules.promotions.exception.PromotionNotAvailableException;
import com.gonzalez.erp.modules.promotions.repository.PromotionRepository;
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
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pedidos con promos por producto: cada línea lleva las variantes elegidas, el total suma las
 * promos y el stock se mide por variante sumando lo suelto y lo que llevan las promos.
 */
@ExtendWith(MockitoExtension.class)
class OrderPromoTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BRANCH_ID = 10L;
    private static final Long REMERA_M = 40L;
    private static final Long REMERA_L = 42L;
    private static final Long GORRA = 41L;
    private static final Long MEDIA = 43L;
    private static final Long PROMO_ID = 70L;
    private static final Long OTHER_PROMO_ID = 71L;
    private static final Long ORDER_ID = 100L;
    private static final Long LINE_ID = 500L;

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
    @Mock private PromotionRepository promotionRepository;

    @InjectMocks private OrderServiceImpl orderService;

    private Company company;
    private Branch branch;
    private User user;
    private Product remera;
    private Product gorra;
    private final Map<Long, ProductVariant> variants = new HashMap<>();
    private final Map<Long, Stock> stocks = new HashMap<>();

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
        remera = product(200L, "Remera");
        gorra = product(201L, "Gorra");
        variant(REMERA_M, remera, "1000");
        variant(REMERA_L, remera, "1200");
        variant(GORRA, gorra, "800");
        variant(MEDIA, product(202L, "Media"), "300");

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
    void eachUnitCanBeADifferentVariantAndStockCountsLooseAndPromoUnitsTogether() {
        stubCreate();
        stubStock(REMERA_M, 5);
        stubStock(REMERA_L, 5);
        stubStock(GORRA, 5);
        stubPromotion(promotion(PROMO_ID, "2 remeras + gorra", "2000", today(), today()));

        // 1 remera M suelta ($1000) + promo ($2000) con remera M, remera L y gorra.
        OrderResponse response = orderService.create(walkIn(
                List.of(new OrderItemRequest(REMERA_M, 1)),
                List.of(newLine(PROMO_ID, 1, choice(REMERA_M, 1), choice(REMERA_L, 1), choice(GORRA, 1)))));

        assertThat(response.total()).isEqualByComparingTo("3000");
        assertThat(response.promos()).singleElement().satisfies(promo -> {
            assertThat(promo.name()).isEqualTo("2 remeras + gorra");
            assertThat(promo.unitPrice()).isEqualByComparingTo("2000");
            assertThat(promo.components()).hasSize(3);
        });
        assertThat(stocks.get(REMERA_M).getQuantity()).isEqualTo(3);
        assertThat(stocks.get(REMERA_L).getQuantity()).isEqualTo(4);
        assertThat(stocks.get(GORRA).getQuantity()).isEqualTo(4);
        verify(stockMovementRecorder).record(eq(stocks.get(REMERA_M)), eq(StockMovementType.SALE), eq(-2), eq(5),
                isNull(), eq("ORDER"), eq(ORDER_ID));
    }

    @Test
    void theSamePromoCanGoInSeveralLinesWithDifferentVariants() {
        stubCreate();
        stubStock(REMERA_M, 5);
        stubStock(REMERA_L, 5);
        stubStock(GORRA, 5);
        stubPromotion(promotion(PROMO_ID, "Promo", "2000", today(), today()));

        OrderResponse response = orderService.create(walkIn(List.of(), List.of(
                newLine(PROMO_ID, 2, choice(REMERA_M, 2), choice(GORRA, 1)),
                newLine(PROMO_ID, 1, choice(REMERA_L, 2), choice(GORRA, 1)))));

        assertThat(response.promos()).hasSize(2);
        assertThat(response.total()).isEqualByComparingTo("6000");
        assertThat(stocks.get(REMERA_M).getQuantity()).isEqualTo(1);
        assertThat(stocks.get(REMERA_L).getQuantity()).isEqualTo(3);
        assertThat(stocks.get(GORRA).getQuantity()).isEqualTo(2);
    }

    @Test
    void stockIsCheckedAgainstLooseAndPromoUnitsTogether() {
        stubCreate();
        // Alcanza para la promo (2) o para la suelta (1), no para las dos.
        stubStock(REMERA_M, 2);
        stubStock(GORRA, 5);
        stubPromotion(promotion(PROMO_ID, "Promo", "2000", today(), today()));

        assertThatThrownBy(() -> orderService.create(walkIn(
                List.of(new OrderItemRequest(REMERA_M, 1)),
                List.of(newLine(PROMO_ID, 1, choice(REMERA_M, 2), choice(GORRA, 1))))))
                .isInstanceOf(InsufficientStockForEditException.class);
        verify(stockMovementRecorder, never()).record(any(), any(), anyInt(), anyInt(), any(), any(), any());
    }

    @Test
    void theChosenVariantsMustCoverEachProductExactly() {
        stubCreate();
        stubPromotion(promotion(PROMO_ID, "Promo", "2000", today(), today()));

        // Lleva 2 remeras: elegir una sola no alcanza.
        assertThatThrownBy(() -> orderService.create(walkIn(List.of(),
                List.of(newLine(PROMO_ID, 1, choice(REMERA_M, 1), choice(GORRA, 1))))))
                .isInstanceOf(InvalidOrderException.class);
    }

    @Test
    void aVariantOfAProductOutsideThePromoIsRejected() {
        stubCreate();
        stubPromotion(promotion(PROMO_ID, "Promo", "2000", today(), today()));

        assertThatThrownBy(() -> orderService.create(walkIn(List.of(),
                List.of(newLine(PROMO_ID, 1, choice(REMERA_M, 2), choice(MEDIA, 1))))))
                .isInstanceOf(InvalidOrderException.class);
    }

    @Test
    void anInactiveChosenVariantCannotBeSold() {
        stubCreate();
        stubPromotion(promotion(PROMO_ID, "Promo", "2000", today(), today()));
        variants.get(REMERA_L).deactivate();

        assertThatThrownBy(() -> orderService.create(walkIn(List.of(),
                List.of(newLine(PROMO_ID, 1, choice(REMERA_L, 2), choice(GORRA, 1))))))
                .isInstanceOf(PromotionNotAvailableException.class);
    }

    @Test
    void aPromoThatIsNotActiveTodayCannotBeSold() {
        stubCreate();
        stubPromotion(promotion(PROMO_ID, "Vencida", "2000", today().minusDays(10), today().minusDays(1)));

        assertThatThrownBy(() -> orderService.create(walkIn(List.of(),
                List.of(newLine(PROMO_ID, 1, choice(REMERA_M, 2), choice(GORRA, 1))))))
                .isInstanceOf(PromotionNotAvailableException.class);
    }

    @Test
    void anOrderNeedsAnItemOrAPromo() {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);

        assertThatThrownBy(() -> orderService.create(walkIn(List.of(), List.of())))
                .isInstanceOf(InvalidOrderException.class);
    }

    @Test
    void aQuickSaleCannotHavePromos() {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);
        OrderRequest request = new OrderRequest(BRANCH_ID, 20L, SalesType.QUICK_SALE, new BigDecimal("500"),
                DeliveryType.LOCAL_PICKUP, null, null, null, null,
                List.of(newLine(PROMO_ID, 1, choice(REMERA_M, 2), choice(GORRA, 1))));

        assertThatThrownBy(() -> orderService.create(request)).isInstanceOf(QuickSaleValidationException.class);
    }

    // --- Edición ---

    @Test
    void aSoldLineKeepsItsPriceAndVariantsEvenIfThePromoChangedOrExpired() {
        Promotion promotion = promotion(PROMO_ID, "Promo", "2000", today(), today());
        Order order = orderWithLine(promotion, 1);
        promotion.update("Promo nueva", null, new BigDecimal("9999"), today().minusDays(5), today().minusDays(1));
        stubUpdate(order);
        stubStock(REMERA_M, 10);
        stubStock(GORRA, 10);

        orderService.update(ORDER_ID, new OrderUpdateRequest(null, List.of(), null,
                List.of(existingLine(LINE_ID, 2))));

        assertThat(order.getPromos()).singleElement().satisfies(promo -> {
            assertThat(promo.getQuantity()).isEqualTo(2);
            assertThat(promo.getUnitPrice()).isEqualByComparingTo("2000");
            assertThat(promo.getName()).isEqualTo("Promo");
            assertThat(promo.getComponents()).hasSize(2);
        });
        assertThat(order.getTotal()).isEqualByComparingTo("4000");
        // Una promo más: 2 remeras M y 1 gorra más.
        assertThat(stocks.get(REMERA_M).getQuantity()).isEqualTo(8);
        assertThat(stocks.get(GORRA).getQuantity()).isEqualTo(9);
    }

    @Test
    void anExpiredPromoCannotBeAddedWhenEditing() {
        Order order = orderWithLine(promotion(PROMO_ID, "Promo", "2000", today(), today()), 1);
        stubUpdate(order);
        stubPromotion(promotion(OTHER_PROMO_ID, "Vencida", "500", today().minusDays(3), today().minusDays(1)));

        assertThatThrownBy(() -> orderService.update(ORDER_ID, new OrderUpdateRequest(null, List.of(), null,
                List.of(newLine(OTHER_PROMO_ID, 1, choice(REMERA_M, 2), choice(GORRA, 1))))))
                .isInstanceOf(PromotionNotAvailableException.class);
    }

    @Test
    void aLineFromAnotherOrderIsRejected() {
        Order order = orderWithLine(promotion(PROMO_ID, "Promo", "2000", today(), today()), 1);
        stubUpdate(order);

        assertThatThrownBy(() -> orderService.update(ORDER_ID, new OrderUpdateRequest(null, List.of(), null,
                List.of(existingLine(999L, 1)))))
                .isInstanceOf(InvalidOrderException.class);
    }

    @Test
    void replacingTheLineWithLooseUnitsMovesOnlyTheDifference() {
        Order order = orderWithLine(promotion(PROMO_ID, "Promo", "2000", today(), today()), 1);
        stubUpdate(order);
        stubStock(REMERA_M, 10);
        stubStock(GORRA, 10);

        orderService.update(ORDER_ID, new OrderUpdateRequest(null,
                List.of(new OrderItemRequest(REMERA_M, 2)), null, List.of()));

        assertThat(order.getPromos()).isEmpty();
        assertThat(order.getTotal()).isEqualByComparingTo("2000");
        // Las 2 remeras siguen vendidas (sueltas): solo vuelve la gorra.
        assertThat(stocks.get(REMERA_M).getQuantity()).isEqualTo(10);
        assertThat(stocks.get(GORRA).getQuantity()).isEqualTo(11);
        verify(stockMovementRecorder).record(eq(stocks.get(GORRA)), eq(StockMovementType.RETURN), eq(1), eq(10),
                isNull(), eq("ORDER"), eq(ORDER_ID));
    }

    // --- Cancelación ---

    @Test
    void cancellingReturnsLooseAndPromoUnitsPerVariant() {
        Order order = orderWithLine(promotion(PROMO_ID, "Promo", "2000", today(), today()), 1);
        order.addItem(OrderItem.builder()
                .productVariant(variants.get(REMERA_M)).quantity(1).unitPrice(new BigDecimal("1000")).build());
        order.recalculateTotal();
        when(orderRepository.findByIdAndCompanyIdForUpdate(ORDER_ID, COMPANY_ID)).thenReturn(Optional.of(order));
        when(branchAccessService.isAccessible(branch)).thenReturn(true);
        Stock remeraStock = stubStock(REMERA_M, 0);
        Stock gorraStock = stubStock(GORRA, 0);
        when(stockMovementRepository.findByReferenceAndCompanyId(ORDER_ID, "ORDER", COMPANY_ID)).thenReturn(List.of(
                sale(remeraStock, 3),
                sale(gorraStock, 1)));

        orderService.cancel(ORDER_ID, null);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(remeraStock.getQuantity()).isEqualTo(3);
        assertThat(gorraStock.getQuantity()).isEqualTo(1);
    }

    // --- Ayudas ---

    private void stubCreate() {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(branchRepository.getReferenceById(BRANCH_ID)).thenReturn(branch);
        when(userRepository.getReferenceById(7L)).thenReturn(user);
        OrderNumberCounter counter = OrderNumberCounter.builder().company(company).lastNumber(0L).build();
        when(orderNumberCounterRepository.findByCompanyIdForUpdate(COMPANY_ID)).thenReturn(Optional.of(counter));
        lenient().when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(ORDER_ID);
            return order;
        });
        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubUpdate(Order order) {
        when(orderRepository.findByIdAndCompanyIdForUpdate(ORDER_ID, COMPANY_ID)).thenReturn(Optional.of(order));
        when(branchAccessService.isAccessible(branch)).thenReturn(true);
        lenient().when(orderRepository.save(order)).thenReturn(order);
    }

    private void stubPromotion(Promotion promotion) {
        when(promotionRepository.findByIdAndCompanyId(promotion.getId(), COMPANY_ID)).thenReturn(Optional.of(promotion));
    }

    private Stock stubStock(Long variantId, int quantity) {
        Stock stock = Stock.builder()
                .productVariant(variants.get(variantId)).branch(branch).company(company).quantity(quantity).build();
        stock.setId(variantId + 1000);
        stocks.put(variantId, stock);
        lenient().when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(variantId, BRANCH_ID, COMPANY_ID))
                .thenReturn(Optional.of(stock));
        return stock;
    }

    private static StockMovement sale(Stock stock, int units) {
        return StockMovement.builder().stock(stock).type(StockMovementType.SALE).quantity(-units).build();
    }

    private static LocalDate today() {
        return LocalDate.now();
    }

    private OrderRequest walkIn(List<OrderItemRequest> items, List<OrderPromoRequest> promos) {
        return new OrderRequest(BRANCH_ID, null, SalesType.WITH_PRODUCTS, null, DeliveryType.LOCAL_PICKUP,
                null, items, null, null, promos);
    }

    private static PromoVariantRequest choice(Long variantId, int quantity) {
        return new PromoVariantRequest(variantId, quantity);
    }

    private static OrderPromoRequest newLine(Long promotionId, int quantity, PromoVariantRequest... choices) {
        return new OrderPromoRequest(null, promotionId, quantity, List.of(choices));
    }

    private static OrderPromoRequest existingLine(Long id, int quantity) {
        return new OrderPromoRequest(id, null, quantity, null);
    }

    /** 2 remeras + 1 gorra; la variante de cada unidad se elige al vender. */
    private Promotion promotion(Long id, String name, String price, LocalDate from, LocalDate to) {
        Promotion promotion = Promotion.builder()
                .company(company)
                .name(name)
                .price(new BigDecimal(price))
                .startDate(from)
                .endDate(to)
                .build();
        promotion.setId(id);
        promotion.replaceItems(List.of(
                PromotionItem.builder().product(remera).quantity(2).build(),
                PromotionItem.builder().product(gorra).quantity(1).build()));
        return promotion;
    }

    /** Pedido con una línea de la promo vendida con 2 remeras M y 1 gorra. */
    private Order orderWithLine(Promotion promotion, int quantity) {
        Order order = Order.builder()
                .orderNumber("PED-001")
                .branch(branch)
                .createdBy(user)
                .company(company)
                .status(OrderStatus.TO_PREPARE)
                .salesType(SalesType.WITH_PRODUCTS)
                .deliveryType(DeliveryType.SHIPPING)
                .build();
        order.setId(ORDER_ID);
        OrderPromo line = OrderPromo.builder()
                .order(order)
                .promotion(promotion)
                .name(promotion.getName())
                .unitPrice(promotion.getPrice())
                .quantity(quantity)
                .build();
        line.setId(LINE_ID);
        line.addComponent(OrderPromoComponent.builder().productVariant(variants.get(REMERA_M)).quantity(2).build());
        line.addComponent(OrderPromoComponent.builder().productVariant(variants.get(GORRA)).quantity(1).build());
        order.getPromos().add(line);
        order.recalculateTotal();
        return order;
    }

    private Product product(Long id, String name) {
        Product product = Product.builder().name(name).company(company).build();
        product.setId(id);
        return product;
    }

    private void variant(Long id, Product product, String price) {
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku("SKU-" + id)
                .price(new BigDecimal(price))
                .company(company)
                .build();
        variant.setId(id);
        variants.put(id, variant);
        lenient().when(productVariantRepository.findByIdWithProductAndCompany(id)).thenReturn(Optional.of(variant));
    }
}
