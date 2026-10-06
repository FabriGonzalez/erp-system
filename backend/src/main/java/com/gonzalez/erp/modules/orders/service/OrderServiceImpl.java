package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
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
import com.gonzalez.erp.modules.orders.exception.InsufficientStockForEditException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderStatusTransitionException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.orders.mapper.OrderMapper;
import com.gonzalez.erp.modules.orders.repository.OrderNumberCounterRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final String REFERENCE_TYPE = "ORDER";

    private final OrderRepository orderRepository;
    private final OrderNumberCounterRepository orderNumberCounterRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final BranchRepository branchRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAccountService customerAccountService;
    private final PaymentAllocationRepository paymentAllocationRepository;
    private final UserRepository userRepository;
    private final UserBranchRepository userBranchRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<OrderResponse> findAll(OrderStatus status, Long branchId, SalesType salesType, DeliveryType deliveryType) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        List<Long> accessibleBranchIds = userBranchRepository.findByUserId(userId).stream()
                .map(ub -> ub.getBranch().getId())
                .toList();

        return orderRepository.search(companyId, status, salesType, deliveryType, branchId).stream()
                .filter(order -> order.getBranch() != null
                        && accessibleBranchIds.contains(order.getBranch().getId()))
                .map(this::toOrderResponse)
                .toList();
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
        validateSalesType(request.salesType(), request.items(), request.customerId(), request.quickSaleAmount());

        Customer customer = resolveCustomerOrNull(request.customerId(), companyId);
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

            if (saved.getCustomer() != null) {
                customerAccountService.applyTransaction(
                        saved.getCustomer().getId(),
                        companyId,
                        saved.getTotal(),
                        TransactionType.ORDER_CHARGE,
                        saved.getBranch(),
                        "Cargo por pedido #" + saved.getOrderNumber()
                );
            }

            return toOrderResponse(saved);
        } else {
            order.recalculateTotal();
            Order saved = orderRepository.saveAndFlush(order);

            if (saved.getCustomer() != null) {
                customerAccountService.applyTransaction(
                        saved.getCustomer().getId(),
                        companyId,
                        saved.getTotal(),
                        TransactionType.ORDER_CHARGE,
                        saved.getBranch(),
                        "Cargo por pedido #" + saved.getOrderNumber()
                );
            }

            return toOrderResponse(saved);
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

        if (request.branchId() != null && !request.branchId().equals(order.getBranch().getId())) {
            throw new InvalidOrderStatusTransitionException(
                    "Branch cannot be changed for TO_PREPARE orders because stock is already committed");
        }

        if (request.salesType() != null && request.salesType() != order.getSalesType()) {
            throw new InvalidOrderStatusTransitionException(
                    "Sales type cannot be changed for TO_PREPARE orders");
        }

        if (request.deliveryType() != null && request.deliveryType() != order.getDeliveryType()) {
            throw new InvalidOrderStatusTransitionException(
                    "Delivery type cannot be changed for TO_PREPARE orders");
        }

        if (request.customerId() != null) {
            Long currentCustomerId = order.getCustomer() != null
                    ? order.getCustomer().getId()
                    : null;

            if (!request.customerId().equals(currentCustomerId)) {
                throw new InvalidOrderException(
                        "Customer cannot be changed for an existing order");
            }
        }

        BigDecimal oldTotal = order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO;

        Long customerId = request.customerId() != null
                ? request.customerId()
                : (order.getCustomer() != null ? order.getCustomer().getId() : null);

        Customer customer = resolveCustomerOrNull(customerId, companyId);

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

        return toOrderResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse ship(Long id) {
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
        BigDecimal total = order.getTotal() != null
                ? order.getTotal()
                : BigDecimal.ZERO;

        BigDecimal amountPaid = paymentAllocationRepository
                .sumAmountByOrderId(order.getId());

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

    private void validateSalesType(SalesType salesType, List<OrderItemRequest> items, Long customerId, BigDecimal quickSaleAmount) {
        if (salesType == SalesType.QUICK_SALE) {
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
        stockMovementRepository.save(StockMovement.builder()
                .stock(stock)
                .type(type)
                .quantity(quantity)
                .previousQuantity(previousQuantity)
                .newQuantity(stock.getQuantity())
                .reason(null)
                .referenceId(referenceId)
                .referenceType(REFERENCE_TYPE)
                .build());
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