package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.orders.dto.request.OrderItemRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderCancelRequest;
import com.gonzalez.erp.modules.orders.dto.request.RefundAction;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderNumberCounter;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import com.gonzalez.erp.modules.orders.exception.InactiveOrderCustomerException;
import com.gonzalez.erp.modules.orders.exception.InsufficientStockForEditException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderStatusTransitionException;
import com.gonzalez.erp.modules.orders.exception.InvalidShippingAddressException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.orders.mapper.OrderMapper;
import com.gonzalez.erp.modules.orders.repository.OrderNumberCounterRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.service.OrderPaymentService;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.shipments.entity.Shipment;
import com.gonzalez.erp.modules.shipments.repository.ShipmentRepository;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final String REFERENCE_TYPE = "ORDER";

    private final OrderRepository orderRepository;
    private final OrderNumberCounterRepository orderNumberCounterRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockMovementRecorder stockMovementRecorder;
    private final BranchRepository branchRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAccountService customerAccountService;
    private final PaymentAllocationRepository paymentAllocationRepository;
    private final UserRepository userRepository;
    private final UserBranchRepository userBranchRepository;
    private final CompanyRepository companyRepository;
    private final OrderPaymentService orderPaymentService;
    private final AddressRepository addressRepository;
    private final ShipmentRepository shipmentRepository;

    @Override
    public PageResponse<OrderResponse> findAll(OrderStatus status, Long branchId, SalesType salesType,
                                               DeliveryType deliveryType, Long customerId,
                                               PaymentStatus paymentStatus, String query, Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        List<Long> accessibleBranchIds = userBranchRepository.findByUserId(userId).stream()
                .map(ub -> ub.getBranch().getId())
                .toList();

        if (accessibleBranchIds.isEmpty()) {
            return new PageResponse<>(List.of(), pageable.getPageNumber(), pageable.getPageSize(), 0, 0);
        }

        String trimmedQuery = query == null ? "" : query.trim().toLowerCase();
        boolean hasQuery = !trimmedQuery.isEmpty();
        String likePattern = hasQuery ? "%" + trimmedQuery + "%" : "%";

        Page<Order> orders = orderRepository.search(companyId, accessibleBranchIds, status, salesType, deliveryType,
                branchId, customerId, hasQuery, likePattern,
                paymentStatus == PaymentStatus.PAID,
                paymentStatus == PaymentStatus.PENDING,
                paymentStatus == PaymentStatus.PARTIAL,
                pageable);

        // Una sola consulta para los envíos de la página, no una por pedido.
        List<Long> shippingOrderIds = orders.getContent().stream()
                .filter(order -> order.getDeliveryType() == DeliveryType.SHIPPING)
                .map(Order::getId)
                .toList();
        Map<Long, Shipment> shipmentsByOrderId = shippingOrderIds.isEmpty()
                ? Map.of()
                : shipmentRepository.findByOrderIdIn(shippingOrderIds).stream()
                        .collect(Collectors.toMap(shipment -> shipment.getOrder().getId(), Function.identity()));

        return PageResponse.of(orders,
                order -> toOrderResponse(order, shipmentsByOrderId.get(order.getId())));
    }

    @Override
    public OrderResponse findById(Long id) {
        return toOrderResponse(findOrderAndValidateAccess(id));
    }

    @Override
    @Transactional
    public OrderResponse create(OrderRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();
        Company company = companyRepository.getReferenceById(companyId);

        validateBranchAccess(request.branchId());
        validateSalesType(request.salesType(), request.deliveryType(), request.items(),
                request.customerId(), request.quickSaleAmount());
        validatePaymentOptions(request);

        Customer customer = resolveCustomerOrNull(request.customerId(), companyId);
        // Solo en el alta: los pedidos ya creados de un cliente desactivado se siguen pudiendo editar.
        if (customer != null && !customer.isActive()) {
            throw new InactiveOrderCustomerException(customer.getId());
        }
        Address shippingAddress = resolveShippingAddressForCreate(request, customer);
        String orderNumber = generateOrderNumber(company);

        OrderStatus status = (request.deliveryType() == DeliveryType.LOCAL_PICKUP)
                ? OrderStatus.CONFIRMED
                : OrderStatus.TO_PREPARE;

        Instant now = Instant.now();
        Instant confirmedAt = (status == OrderStatus.CONFIRMED) ? now : null;
        Instant preparedAt = (status == OrderStatus.TO_PREPARE) ? now : null;

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .branch(branchRepository.getReferenceById(request.branchId()))
                .customer(customer)
                .createdBy(userRepository.getReferenceById(userId))
                .status(status)
                .company(company)
                .salesType(request.salesType())
                .quickSaleAmount(request.salesType() == SalesType.QUICK_SALE ? request.quickSaleAmount() : null)
                .deliveryType(request.deliveryType())
                .confirmedAt(confirmedAt)
                .preparedAt(preparedAt)
                .amountPaid(BigDecimal.ZERO)
                .build();

        if (request.salesType() == SalesType.WITH_PRODUCTS) {
            List<OrderItem> items = buildItemsFromRequest(request.items(), companyId);
            order.updateItems(items);
            order.recalculateTotal();

            Order saved = orderRepository.saveAndFlush(order);

            Long branchId = request.branchId();
            List<Long> sortedVariantIds = request.items().stream()
                    .map(OrderItemRequest::productVariantId)
                    .distinct()
                    .sorted()
                    .toList();

            for (Long variantId : sortedVariantIds) {
                stockRepository.insertIfAbsent(variantId, branchId, companyId);
            }

            Map<Long, Stock> lockedStocks = new HashMap<>();
            for (Long variantId : sortedVariantIds) {
                Stock stock = stockRepository.findByProductVariantIdAndBranchIdForUpdate(variantId, branchId, companyId)
                        .orElseThrow(() -> new StockNotFoundException(variantId.toString(), branchId));
                lockedStocks.put(variantId, stock);
            }

            for (OrderItem item : saved.getItems()) {
                Stock stock = lockedStocks.get(item.getProductVariant().getId());
                if (stock.getQuantity() < item.getQuantity()) {
                    throw new InsufficientStockForEditException(
                            "Insufficient stock for variant id: " + item.getProductVariant().getId()
                                    + ". Current quantity: " + stock.getQuantity()
                                    + ", requested: " + item.getQuantity());
                }
            }

            for (OrderItem item : saved.getItems()) {
                Stock stock = lockedStocks.get(item.getProductVariant().getId());
                int previousQuantity = stock.getQuantity();
                stock.setQuantity(previousQuantity - item.getQuantity());
                stockRepository.save(stock);
                saveMovement(stock, StockMovementType.SALE, -item.getQuantity(), previousQuantity, saved.getId());
            }

            return completeCreation(saved, shippingAddress, request, companyId, userId);
        } else {
            order.recalculateTotal();
            Order saved = orderRepository.saveAndFlush(order);

            return completeCreation(saved, shippingAddress, request, companyId, userId);
        }
    }

    /**
     * Guarda el envío (si lo hay) y registra el cargo en la cuenta del cliente y aplica,
     * en este orden, el saldo a favor (si se pidió) y el pago inicial. Ambos se asignan a
     * esta orden aunque el cliente tenga deudas anteriores. Las ventas sin cliente se
     * cobran en el acto.
     */
    private OrderResponse completeCreation(Order saved, Address shippingAddress, OrderRequest request,
                                           Long companyId, Long userId) {
        Shipment shipment = shippingAddress != null ? saveShipment(saved, shippingAddress) : null;

        if (saved.getCustomer() == null) {
            saved.setAmountPaid(saved.getTotal());
            return toOrderResponse(orderRepository.save(saved), shipment);
        }

        customerAccountService.applyTransaction(
                saved.getCustomer().getId(),
                companyId,
                saved.getTotal(),
                TransactionType.ORDER_CHARGE,
                saved.getBranch(),
                "Cargo por pedido #" + saved.getOrderNumber()
        );

        if (Boolean.TRUE.equals(request.applyCredit())) {
            orderPaymentService.applyCredit(saved, companyId);
        }

        if (request.initialPayment() != null) {
            orderPaymentService.registerOrderPayment(
                    saved,
                    request.initialPayment().amount(),
                    request.initialPayment().method(),
                    userId,
                    companyId
            );
        }

        return toOrderResponse(saved, shipment);
    }

    private void validatePaymentOptions(OrderRequest request) {
        if (request.customerId() == null
                && (Boolean.TRUE.equals(request.applyCredit()) || request.initialPayment() != null)) {
            throw new InvalidOrderException(
                    "Orders without customer are paid at creation; applyCredit and initialPayment are not allowed");
        }
    }

    @Override
    @Transactional
    public OrderResponse update(Long id, OrderUpdateRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        Order order = orderRepository.findByIdAndCompanyIdForUpdate(id, companyId)
                .filter(o -> o.getBranch() != null && isUserAssignedToBranch(userId, o.getBranch().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (!order.isEditable()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only TO_PREPARE orders can be edited. Current status: " + order.getStatus());
        }

        BigDecimal oldTotal = order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO;

        Long customerId = order.getCustomer() != null ? order.getCustomer().getId() : null;

        Customer customer = resolveCustomerOrNull(customerId, companyId);

        Address newShippingAddress = null;
        if (request.shippingAddressId() != null) {
            if (order.getDeliveryType() != DeliveryType.SHIPPING) {
                throw new InvalidShippingAddressException(
                        "shippingAddressId is only allowed for SHIPPING orders");
            }
            newShippingAddress = findShippingAddress(request.shippingAddressId(), customer);
        }

        Order saved;
        if (order.getSalesType() == SalesType.QUICK_SALE) {
            if (customer == null) {
                throw new QuickSaleValidationException("QUICK_SALE requires a registered customer");
            }
            BigDecimal quickSaleAmount = request.quickSaleAmount() != null
                    ? request.quickSaleAmount() : order.getQuickSaleAmount();
            if (quickSaleAmount == null || quickSaleAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new QuickSaleValidationException("QUICK_SALE requires a positive amount");
            }
            if (request.items() != null && !request.items().isEmpty()) {
                throw new QuickSaleValidationException("QUICK_SALE cannot have items");
            }

            order.setQuickSaleAmount(quickSaleAmount);
            order.getItems().clear();
            order.recalculateTotal();

            saved = orderRepository.save(order);
        } else {
            List<OrderItemRequest> newItems = request.items() != null ? request.items() : List.of();
            if (newItems.isEmpty()) {
                throw new InvalidOrderException("WITH_PRODUCTS requires at least one item");
            }
            validateNoDuplicateVariants(newItems);

            List<OrderItem> builtNewItems = buildItemsFromRequest(newItems, companyId);

            Long branchId = order.getBranch().getId();
            Map<Long, Integer> oldQuantities = new HashMap<>();
            for (OrderItem item : order.getItems()) {
                oldQuantities.put(item.getProductVariant().getId(), item.getQuantity());
            }

            Map<Long, Integer> newQuantities = new LinkedHashMap<>();
            for (OrderItem item : builtNewItems) {
                newQuantities.put(item.getProductVariant().getId(), item.getQuantity());
            }

            Set<Long> affectedVariantIds = new HashSet<>();
            affectedVariantIds.addAll(oldQuantities.keySet());
            affectedVariantIds.addAll(newQuantities.keySet());
            List<Long> sortedVariantIds = affectedVariantIds.stream().sorted().toList();

            for (Long variantId : sortedVariantIds) {
                stockRepository.insertIfAbsent(variantId, branchId, companyId);
            }

            Map<Long, Stock> lockedStocks = new HashMap<>();
            for (Long variantId : sortedVariantIds) {
                Stock stock = stockRepository.findByProductVariantIdAndBranchIdForUpdate(variantId, branchId, companyId)
                        .orElseThrow(() -> new StockNotFoundException(variantId.toString(), branchId));
                lockedStocks.put(variantId, stock);
            }

            for (Long variantId : sortedVariantIds) {
                int oldQty = oldQuantities.getOrDefault(variantId, 0);
                int newQty = newQuantities.getOrDefault(variantId, 0);
                int delta = newQty - oldQty;
                if (delta > 0) {
                    Stock stock = lockedStocks.get(variantId);
                    if (stock.getQuantity() < delta) {
                        throw new InsufficientStockForEditException(
                                "Insufficient stock to increase variant id: " + variantId
                                        + ". Current quantity: " + stock.getQuantity()
                                        + ", additional requested: " + delta);
                    }
                }
            }

            for (Long variantId : sortedVariantIds) {
                int oldQty = oldQuantities.getOrDefault(variantId, 0);
                int newQty = newQuantities.getOrDefault(variantId, 0);
                int delta = newQty - oldQty;
                if (delta == 0) {
                    continue;
                }
                Stock stock = lockedStocks.get(variantId);
                int previousQuantity = stock.getQuantity();
                if (delta > 0) {
                    stock.setQuantity(previousQuantity - delta);
                    stockRepository.save(stock);
                    saveMovement(stock, StockMovementType.SALE, -delta, previousQuantity, order.getId());
                } else {
                    int returnQty = -delta;
                    stock.setQuantity(previousQuantity + returnQty);
                    stockRepository.save(stock);
                    saveMovement(stock, StockMovementType.RETURN, returnQty, previousQuantity, order.getId());
                }
            }

            order.updateItems(builtNewItems);
            order.recalculateTotal();

            saved = orderRepository.save(order);
        }

        BigDecimal newTotal = saved.getTotal() != null ? saved.getTotal() : BigDecimal.ZERO;
        BigDecimal deltaTotal = newTotal.subtract(oldTotal);

        if (deltaTotal.compareTo(BigDecimal.ZERO) != 0 && saved.getCustomer() != null) {
            customerAccountService.applyTransaction(
                    saved.getCustomer().getId(),
                    companyId,
                    deltaTotal,
                    TransactionType.ORDER_CHARGE,
                    saved.getBranch(),
                    "Ajuste por edición de pedido #" + saved.getOrderNumber()
            );
        }

        if (saved.getCustomer() == null) {
            saved.setAmountPaid(newTotal);
            saved = orderRepository.save(saved);
        } else if (deltaTotal.signum() < 0) {
            orderPaymentService.trimAllocationsToTotal(saved);
        }

        // Crea el envío si el pedido no lo tenía (los creados antes de guardar la dirección).
        if (newShippingAddress != null) {
            return toOrderResponse(saved, saveShipment(saved, newShippingAddress));
        }
        return toOrderResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse dispatch(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        Order order = orderRepository.findByIdAndCompanyIdForUpdate(id, companyId)
                .filter(o -> o.getBranch() != null
                        && isUserAssignedToBranch(userId, o.getBranch().getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Order not found with id: " + id));

        if (!order.canShip()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only SHIPPING orders in TO_PREPARE can be shipped. Current status: "
                            + order.getStatus()
                            + ", deliveryType: "
                            + order.getDeliveryType());
        }

        order.ship();
        orderRepository.save(order);

        return toOrderResponse(order);
    }


    @Override
    @Transactional
    public OrderResponse cancel(Long id, OrderCancelRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        Order order = orderRepository.findByIdAndCompanyIdForUpdate(id, companyId)
                .filter(o -> o.getBranch() != null && isUserAssignedToBranch(userId, o.getBranch().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (!order.canCancel()) {
            throw new InvalidOrderStatusTransitionException(
                    "Cannot cancel order in status: " + order.getStatus());
        }

        if (order.getSalesType() == SalesType.WITH_PRODUCTS && !order.getItems().isEmpty()) {
            List<StockMovement> originalMovements = stockMovementRepository
                    .findByReferenceAndCompanyId(order.getId(), REFERENCE_TYPE, companyId);

            List<Long> sortedVariantIds = order.getItems().stream()
                    .map(item -> item.getProductVariant().getId())
                    .distinct()
                    .sorted()
                    .toList();

            Map<Long, Stock> lockedStocks = new HashMap<>();
            for (Long variantId : sortedVariantIds) {
                Stock stock = stockRepository.findByProductVariantIdAndBranchIdForUpdate(variantId, order.getBranch().getId(), companyId)
                        .orElseThrow(() -> new StockNotFoundException(variantId.toString(), order.getBranch().getId()));
                lockedStocks.put(variantId, stock);
            }

            for (OrderItem item : order.getItems()) {
                Stock stock = lockedStocks.get(item.getProductVariant().getId());
                int netConsumed = -originalMovements.stream()
                    .filter(m -> m.getStock().getId().equals(stock.getId()))
                    .filter(m -> m.getType() == StockMovementType.SALE
                            || m.getType() == StockMovementType.RETURN)
                    .mapToInt(StockMovement::getQuantity)
                    .sum();

                if (netConsumed != item.getQuantity()) {
                    throw new InvalidOrderException(
                            "Net stock consumption mismatch for variant id: " + item.getProductVariant().getId()
                                    + ". Expected: " + item.getQuantity() + ", actual net: " + netConsumed);
                }
            }

            for (OrderItem item : order.getItems()) {
                Stock stock = lockedStocks.get(item.getProductVariant().getId());
                int previousQuantity = stock.getQuantity();
                stock.setQuantity(previousQuantity + item.getQuantity());
                stockRepository.save(stock);
                saveMovement(stock, StockMovementType.RETURN, item.getQuantity(), previousQuantity, order.getId());
            }
        }

        if (order.getCustomer() != null) {
            BigDecimal activeAllocated = paymentAllocationRepository.sumAmountByOrderId(order.getId());

            paymentAllocationRepository.deleteByOrderId(order.getId());

            customerAccountService.applyTransaction(
                    order.getCustomer().getId(),
                    companyId,
                    order.getTotal().negate(),
                    TransactionType.ORDER_CHARGE,
                    order.getBranch(),
                    "Reversión por cancelación de pedido #" + order.getOrderNumber()
            );

            RefundAction refundAction = (request != null && request.refundAction() != null)
                    ? request.refundAction()
                    : RefundAction.KEEP_AS_CREDIT;

            if (refundAction == RefundAction.REFUND_MONEY && activeAllocated.compareTo(BigDecimal.ZERO) > 0) {
                customerAccountService.applyTransaction(
                        order.getCustomer().getId(),
                        companyId,
                        activeAllocated,
                        TransactionType.REFUND,
                        order.getBranch(),
                        "Devolución por cancelación de pedido #" + order.getOrderNumber()
                );
            }
        }

        order.cancel();
        orderRepository.save(order);
        return toOrderResponse(order);
    }

    private Order findOrderAndValidateAccess(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        return orderRepository.findByIdAndCompanyId(id, companyId)
                .filter(order -> order.getBranch() != null
                        && isUserAssignedToBranch(userId, order.getBranch().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
    }

    private OrderResponse toOrderResponse(Order order) {
        Shipment shipment = order.getDeliveryType() == DeliveryType.SHIPPING
                ? shipmentRepository.findByOrderId(order.getId()).orElse(null)
                : null;
        return toOrderResponse(order, shipment);
    }

    private OrderResponse toOrderResponse(Order order, Shipment shipment) {
        BigDecimal total = order.getTotal() != null
                ? order.getTotal()
                : BigDecimal.ZERO;

        // Las ventas sin cliente se cobran al crearse.
        BigDecimal amountPaid = order.getCustomer() == null
                ? total
                : paymentAllocationRepository.sumAmountByOrderId(order.getId());

        if (amountPaid == null) {
            amountPaid = BigDecimal.ZERO;
        }

        BigDecimal balance = total.subtract(amountPaid);

        PaymentStatus paymentStatus = OrderMapper.computePaymentStatus(
                total,
                amountPaid
        );

        return OrderMapper.toResponse(
                order,
                shipment,
                amountPaid,
                paymentStatus,
                balance
        );
    }

    private void validateBranchAccess(Long branchId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        branchRepository.findByIdAndCompanyId(branchId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Branch not found with id: " + branchId + " in the current company"));

        if (!isUserAssignedToBranch(userId, branchId)) {
            throw new AccessDeniedException("User is not assigned to branch: " + branchId);
        }
    }

    private boolean isUserAssignedToBranch(Long userId, Long branchId) {
        return userBranchRepository.existsByUserIdAndBranchId(userId, branchId);
    }

    private Customer resolveCustomerOrNull(Long customerId, Long companyId) {
        if (customerId == null) {
            return null;
        }
        return customerRepository.findByIdAndCompanyId(customerId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found with id: " + customerId + " in the current company"));
    }

    private Address resolveShippingAddressForCreate(OrderRequest request, Customer customer) {
        if (request.deliveryType() != DeliveryType.SHIPPING) {
            if (request.shippingAddressId() != null) {
                throw new InvalidShippingAddressException(
                        "shippingAddressId is only allowed for SHIPPING orders");
            }
            return null;
        }
        if (request.shippingAddressId() == null) {
            throw new InvalidShippingAddressException("SHIPPING orders require a shippingAddressId");
        }
        return findShippingAddress(request.shippingAddressId(), customer);
    }

    /** La dirección tiene que ser del cliente del pedido (y por lo tanto de la empresa) y estar activa. */
    private Address findShippingAddress(Long addressId, Customer customer) {
        if (customer == null) {
            throw new InvalidShippingAddressException("SHIPPING orders require a customer");
        }

        Address address = addressRepository.findByIdAndCustomerId(addressId, customer.getId())
                .orElseThrow(() -> new InvalidShippingAddressException(
                        "Address " + addressId + " does not belong to customer " + customer.getId()));

        if (!address.isActive()) {
            throw new InvalidShippingAddressException("Address " + addressId + " is inactive");
        }
        // Calle y ciudad son obligatorias en el envío; direcciones viejas podrían no tenerlas.
        if (isBlank(address.getStreet()) || isBlank(address.getCity())) {
            throw new InvalidShippingAddressException("Address " + addressId + " has no street or city");
        }
        return address;
    }

    private Shipment saveShipment(Order order, Address address) {
        Shipment shipment = shipmentRepository.findByOrderId(order.getId())
                .orElseGet(() -> Shipment.builder().order(order).build());
        shipment.copyAddress(address);
        return shipmentRepository.saveAndFlush(shipment);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void validateSalesType(SalesType salesType, DeliveryType deliveryType, List<OrderItemRequest> items,
                                   Long customerId, BigDecimal quickSaleAmount) {
        if (salesType == SalesType.QUICK_SALE) {
            // La venta rápida es solo en el local: un envío siempre lleva productos.
            if (deliveryType != DeliveryType.LOCAL_PICKUP) {
                throw new QuickSaleValidationException("QUICK_SALE orders must be LOCAL_PICKUP");
            }
            if (customerId == null) {
                throw new QuickSaleValidationException("QUICK_SALE requires a registered customer");
            }
            if (quickSaleAmount == null || quickSaleAmount.signum() <= 0) {
                throw new QuickSaleValidationException("QUICK_SALE requires a positive quickSaleAmount");
            }
            if (items != null && !items.isEmpty()) {
                throw new QuickSaleValidationException("QUICK_SALE cannot have items");
            }
            return;
        }

        if (items == null || items.isEmpty()) {
            throw new InvalidOrderException("WITH_PRODUCTS requires at least one item");
        }
        validateNoDuplicateVariants(items);
    }

    private void validateNoDuplicateVariants(List<OrderItemRequest> items) {
        Set<Long> seenVariants = new HashSet<>();
        for (OrderItemRequest item : items) {
            if (!seenVariants.add(item.productVariantId())) {
                throw new InvalidOrderException(
                        "Duplicate variant in order items: " + item.productVariantId());
            }
        }
    }

    private List<OrderItem> buildItemsFromRequest(List<OrderItemRequest> items, Long companyId) {
        List<OrderItem> orderItems = new ArrayList<>();
        for (OrderItemRequest itemRequest : items) {
            ProductVariant variant = productVariantRepository
                    .findByIdWithProductAndCompany(itemRequest.productVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product variant not found with id: " + itemRequest.productVariantId()));

            if (variant.getCompany() == null || !companyId.equals(variant.getCompany().getId())) {
                throw new ResourceNotFoundException(
                        "Product variant not found with id: " + itemRequest.productVariantId());
            }

            orderItems.add(OrderItem.builder()
                    .productVariant(variant)
                    .quantity(itemRequest.quantity())
                    .unitPrice(variant.getPrice())
                    .build());
        }
        return orderItems;
    }

    private void saveMovement(Stock stock, StockMovementType type, int quantity,
                              int previousQuantity, Long referenceId) {
        stockMovementRecorder.record(stock, type, quantity, previousQuantity, null,
                REFERENCE_TYPE, referenceId);
    }

    @Transactional
    protected String generateOrderNumber(Company company) {
        Long companyId = company.getId();

        OrderNumberCounter counter = orderNumberCounterRepository
                .findByCompanyIdForUpdate(companyId)
                .orElse(null);

        if (counter == null) {
            Long seed = orderRepository.getMaxOrderNumberForCompany(companyId);

            orderNumberCounterRepository.insertIfAbsent(
                    companyId,
                    seed == null ? 0L : seed
            );

            counter = orderNumberCounterRepository
                    .findByCompanyIdForUpdate(companyId)
                    .orElseThrow(() -> new InvalidOrderException(
                            "Could not obtain order number counter for company id: " + companyId));
        }

        Long next = counter.increment();

        orderNumberCounterRepository.save(counter);

        return "PED-" + String.format("%03d", next);
    }
}