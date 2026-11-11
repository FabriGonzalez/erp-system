package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoPreferenceClient.PreferenceRequest;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoPaymentService;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoPaymentService.PaymentLink;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderPromo;
import com.gonzalez.erp.modules.orders.entity.OrderPromoComponent;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.orders.service.OrderService;
import com.gonzalez.erp.modules.orders.service.WebOrderCommand;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartRequest;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutRequest;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutResponse;
import com.gonzalez.erp.modules.store.dto.StoreFulfillment;
import com.gonzalez.erp.modules.store.entity.StoreAccount;
import com.gonzalez.erp.modules.store.exception.StoreCheckoutException;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.security.StoreCustomer;
import com.gonzalez.erp.modules.store.shipping.ShippingProvider;
import com.gonzalez.erp.modules.store.web.StoreSiteUrls;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * Convierte el carrito en un pedido web esperando el pago: reserva el stock y arma el cobro en
 * Mercado Pago, pero todavía no carga la cuenta del cliente (eso pasa cuando se acredita el pago).
 * Todo va en una transacción: si Mercado Pago falla, no queda ni el pedido ni la reserva.
 */
@Service
@Transactional
public class StoreCheckoutServiceImpl implements StoreCheckoutService {

    // Cada compra sin pagar retiene stock hasta que vence: el tope evita que una cuenta lo acapare.
    static final int MAX_PENDING_ORDERS = 3;

    private final CompanyRepository companyRepository;
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final StoreCartService cartService;
    private final ShippingProvider shippingProvider;
    private final StoreAccountRepository accountRepository;
    private final MercadoPagoPaymentService paymentService;
    private final StoreSiteUrls siteUrls;
    private final Duration paymentWindow;

    public StoreCheckoutServiceImpl(
            CompanyRepository companyRepository,
            CustomerRepository customerRepository,
            AddressRepository addressRepository,
            OrderRepository orderRepository,
            OrderService orderService,
            StoreCartService cartService,
            ShippingProvider shippingProvider,
            StoreAccountRepository accountRepository,
            MercadoPagoPaymentService paymentService,
            StoreSiteUrls siteUrls,
            @Value("${app.store.payment-window}") Duration paymentWindow) {
        this.companyRepository = companyRepository;
        this.customerRepository = customerRepository;
        this.addressRepository = addressRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.cartService = cartService;
        this.shippingProvider = shippingProvider;
        this.accountRepository = accountRepository;
        this.paymentService = paymentService;
        this.siteUrls = siteUrls;
        this.paymentWindow = paymentWindow;
    }

    @Override
    public StoreCheckoutResponse checkout(StoreCheckoutRequest request) {
        StoreCustomer current = StoreCustomer.require();
        // Las compras de un mismo comprador van de a una: un doble clic espera a la primera y
        // encuentra su pedido por la clave, y el tope de pendientes no se puede pasar en paralelo.
        Customer customer = customerRepository.findByIdAndCompanyIdForUpdate(current.customerId(), current.companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        Optional<Order> existing = orderRepository.findByCompanyIdAndCheckoutKey(current.companyId(), request.checkoutKey());
        if (existing.isPresent()) {
            if (!existing.get().getCustomer().getId().equals(customer.getId())) {
                throw StoreCheckoutException.checkoutKeyInUse();
            }
            return toResponse(existing.get());
        }

        requireCompleteProfile(customer);
        Address shippingAddress = resolveShippingAddress(request, customer);
        if (orderRepository.countByCustomerIdAndStatus(customer.getId(), OrderStatus.PENDING_PAYMENT) >= MAX_PENDING_ORDERS) {
            throw StoreCheckoutException.tooManyPendingOrders();
        }
        // Antes de reservar: sin forma de cobrar, la compra no tiene sentido.
        if (!paymentService.canCharge(current.companyId())) {
            throw StoreCheckoutException.paymentUnavailable();
        }

        Company company = companyRepository.findById(current.companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        StoreCartEvaluation evaluation = cartService.evaluate(company, request.cart());
        StoreCartQuoteResponse quote = evaluation.quote();
        if (quote.fulfillment() == StoreFulfillment.UNAVAILABLE) {
            throw StoreCheckoutException.cartUnavailable(quote);
        }
        if (quote.total().compareTo(request.expectedTotal()) != 0) {
            throw StoreCheckoutException.cartChanged(quote);
        }

        boolean singleBranch = quote.fulfillment() == StoreFulfillment.SINGLE_BRANCH;
        Branch branch = request.deliveryType() == DeliveryType.LOCAL_PICKUP
                ? pickupBranch(request.pickupBranchId(), evaluation)
                // Con envío sale de la primera por prioridad que lo arma; si ninguna puede, esa
                // primera queda como provisoria y un empleado lo resuelve cuando se pague.
                : branchById(evaluation, singleBranch ? quote.pickupBranches().getFirst().id() : evaluation.storeBranches().getFirst().getId());
        BigDecimal shippingCost = shippingAddress != null
                ? shippingProvider.cost(company, branch, shippingAddress)
                : BigDecimal.ZERO;

        Order order = orderService.createWebOrder(new WebOrderCommand(
                company,
                customer,
                branch,
                request.deliveryType(),
                singleBranch,
                orderItems(quote, evaluation),
                orderPromos(request.cart(), quote, evaluation),
                shippingAddress,
                shippingCost,
                request.checkoutKey()
        ));
        attachPaymentLink(order, company, current);
        return toResponse(order);
    }

    /** El link vence junto con la reserva: después, Mercado Pago ya no deja pagar. */
    private void attachPaymentLink(Order order, Company company, StoreCustomer current) {
        String payerEmail = accountRepository.findById(current.accountId())
                .map(StoreAccount::getEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Store account not found"));
        Instant expiresAt = Instant.now().plus(paymentWindow);
        PaymentLink link = paymentService.createPaymentLink(company.getId(), new PreferenceRequest(
                order.getId().toString(),
                "Pedido " + order.getOrderNumber() + " - " + company.getName(),
                order.getTotal(),
                payerEmail,
                siteUrls.order(company.getStoreDomain(), order.getId()),
                expiresAt));
        order.attachPaymentLink(link.preferenceId(), link.url(), expiresAt);
    }

    private static void requireCompleteProfile(Customer customer) {
        if (isBlank(customer.getFirstName()) || isBlank(customer.getPhone())) {
            throw StoreCheckoutException.profileIncomplete();
        }
    }

    /** Con envío, una dirección propia y completa (un correo real la necesita para cotizar). */
    private Address resolveShippingAddress(StoreCheckoutRequest request, Customer customer) {
        if (request.deliveryType() == DeliveryType.LOCAL_PICKUP) {
            if (request.pickupBranchId() == null || request.addressId() != null) {
                throw StoreCheckoutException.invalidDelivery("LOCAL_PICKUP requires pickupBranchId and no addressId");
            }
            return null;
        }
        if (request.addressId() == null || request.pickupBranchId() != null) {
            throw StoreCheckoutException.invalidDelivery("SHIPPING requires addressId and no pickupBranchId");
        }
        // La de otro comprador y la borrada dan el mismo 404, como en las direcciones de la tienda.
        Address address = addressRepository.findByIdAndCustomerId(request.addressId(), customer.getId())
                .filter(Address::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + request.addressId()));
        boolean incomplete = Stream.of(address.getStreet(), address.getNumber(), address.getCity(),
                address.getState(), address.getPostalCode()).anyMatch(StoreCheckoutServiceImpl::isBlank);
        if (incomplete) {
            throw StoreCheckoutException.addressIncomplete();
        }
        return address;
    }

    /** Solo una de las que la cotización dio como capaces de armar el pedido completo. */
    private static Branch pickupBranch(Long branchId, StoreCartEvaluation evaluation) {
        boolean fulfills = evaluation.quote().pickupBranches().stream()
                .anyMatch(candidate -> candidate.id().equals(branchId));
        if (!fulfills) {
            throw StoreCheckoutException.pickupNotAvailable(evaluation.quote());
        }
        return branchById(evaluation, branchId);
    }

    private static Branch branchById(StoreCartEvaluation evaluation, Long branchId) {
        return evaluation.storeBranches().stream()
                .filter(branch -> branch.getId().equals(branchId))
                .findFirst()
                .orElseThrow();
    }

    /** Las líneas sueltas con el precio web de la cotización (ya vienen sin variantes repetidas). */
    private static List<OrderItem> orderItems(StoreCartQuoteResponse quote, StoreCartEvaluation evaluation) {
        return quote.items().stream()
                .map(line -> OrderItem.builder()
                        .productVariant(evaluation.variants().get(line.productVariantId()))
                        .quantity(line.quantity())
                        .unitPrice(line.unitPrice())
                        .build())
                .toList();
    }

    /** Cada línea de promo guarda nombre, precio web y variantes tal como se compraron. */
    private static List<OrderPromo> orderPromos(StoreCartRequest cart, StoreCartQuoteResponse quote,
                                                StoreCartEvaluation evaluation) {
        List<StoreCartRequest.Promo> requested = cart.promos() != null ? cart.promos() : List.of();
        List<OrderPromo> promos = new ArrayList<>();
        // La cotización devuelve las promos en el mismo orden en que llegaron.
        for (int index = 0; index < requested.size(); index++) {
            StoreCartRequest.Promo line = requested.get(index);
            StoreCartQuoteResponse.Promo quoted = quote.promos().get(index);
            OrderPromo promo = OrderPromo.builder()
                    .promotion(evaluation.promotions().get(line.promotionId()))
                    .name(quoted.name())
                    .unitPrice(quoted.unitPrice())
                    .quantity(line.quantity())
                    .build();

            // Una variante elegida dos veces en la misma promo es un solo componente.
            Map<Long, Integer> unitsByVariant = new LinkedHashMap<>();
            line.variants().forEach(choice -> unitsByVariant.merge(choice.productVariantId(), choice.quantity(), Integer::sum));
            unitsByVariant.forEach((variantId, units) -> promo.addComponent(OrderPromoComponent.builder()
                    .productVariant(evaluation.variants().get(variantId))
                    .quantity(units)
                    .build()));
            promos.add(promo);
        }
        return promos;
    }

    private static StoreCheckoutResponse toResponse(Order order) {
        Branch branch = order.getBranch();
        StoreCartQuoteResponse.PickupBranch pickupBranch = order.getDeliveryType() == DeliveryType.LOCAL_PICKUP
                ? new StoreCartQuoteResponse.PickupBranch(branch.getId(), branch.getName(), branch.getAddress())
                : null;
        return new StoreCheckoutResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus(),
                order.getDeliveryType(),
                order.isStockReserved() ? StoreFulfillment.SINGLE_BRANCH : StoreFulfillment.MULTIPLE_BRANCHES,
                pickupBranch,
                order.getSubtotal(),
                order.getShippingCost(),
                order.getTotal(),
                order.pendingPaymentUrl(Instant.now()),
                order.getPaymentExpiresAt()
        );
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
