package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
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
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    public OrderResponse findById(Long id) {
        return OrderMapper.toResponse(findOrderAndValidateAccess(id));
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

        Order order = Order.builder()
                .orderNumber(orderNumber)
                .branch(branchRepository.getReferenceById(request.branchId()))
                .customer(customer)
                .createdBy(userRepository.getReferenceById(userId))
                .status(OrderStatus.DRAFT)
                .company(company)
                .salesType(request.salesType())
                .quickSaleAmount(request.salesType() == SalesType.QUICK_SALE ? request.quickSaleAmount() : null)
                .deliveryType(request.deliveryType())
                .amountPaid(BigDecimal.ZERO)
                .build();

        if (request.salesType() == SalesType.WITH_PRODUCTS) {
            List<OrderItem> items = buildItemsFromRequest(request.items(), companyId);
            order.updateItems(items);
        }

        order.recalculateTotal();
        Order saved = orderRepository.saveAndFlush(order);
        return OrderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse update(Long id, OrderUpdateRequest request) {
        Order order = findOrderAndValidateAccess(id);

        if (!order.isEditable()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only DRAFT or TO_PREPARE orders can be edited. Current status: " + order.getStatus());
        }

        Long companyId = SecurityUtils.requireCurrentCompanyId();

        if (request.branchId() != null && !request.branchId().equals(order.getBranch().getId())) {
            if (order.isToPrepare()) {
                throw new InvalidOrderStatusTransitionException(
                        "Branch cannot be changed for TO_PREPARE orders because stock is already committed");
            }

            validateBranchAccess(request.branchId());
            order.setBranch(branchRepository.getReferenceById(request.branchId()));
        }

        SalesType salesType;
        DeliveryType deliveryType;

        if (order.isToPrepare()) {
            if (request.salesType() != null && request.salesType() != order.getSalesType()) {
                throw new InvalidOrderStatusTransitionException(
                        "Sales type cannot be changed for TO_PREPARE orders");
            }

            if (request.deliveryType() != null && request.deliveryType() != order.getDeliveryType()) {
                throw new InvalidOrderStatusTransitionException(
                        "Delivery type cannot be changed for TO_PREPARE orders");
            }

            salesType = order.getSalesType();
            deliveryType = order.getDeliveryType();

            if (salesType != SalesType.WITH_PRODUCTS) {
                throw new InvalidOrderStatusTransitionException(
                        "TO_PREPARE orders must remain WITH_PRODUCTS");
            }

            if (deliveryType != DeliveryType.SHIPPING) {
                throw new InvalidOrderStatusTransitionException(
                        "TO_PREPARE orders must remain SHIPPING");
            }
        } else {
            salesType = request.salesType() != null
                    ? request.salesType()
                    : order.getSalesType();

            deliveryType = request.deliveryType() != null
                    ? request.deliveryType()
                    : order.getDeliveryType();
        }

        Long customerId = request.customerId() != null
                ? request.customerId()
                : (order.getCustomer() != null ? order.getCustomer().getId() : null);

        Customer customer = resolveCustomerOrNull(customerId, companyId);

        List<OrderItemRequest> newItems = request.items() != null ? request.items() : List.of();

        if (salesType == SalesType.QUICK_SALE) {
            if (customer == null) {
                throw new QuickSaleValidationException("QUICK_SALE requires a registered customer");
            }
            BigDecimal quickSaleAmount = request.quickSaleAmount() != null
                    ? request.quickSaleAmount() : order.getQuickSaleAmount();
            if (quickSaleAmount == null || quickSaleAmount.signum() <= 0) {
                throw new QuickSaleValidationException("QUICK_SALE requires a positive amount");
            }
            if (!newItems.isEmpty()) {
                throw new QuickSaleValidationException("QUICK_SALE cannot have items");
            }

            order.setSalesType(SalesType.QUICK_SALE);
            order.setDeliveryType(deliveryType);
            order.setQuickSaleAmount(quickSaleAmount);
            order.setCustomer(customer);
            order.getItems().clear();
        } else {
            if (newItems.isEmpty()) {
                throw new InvalidOrderException("WITH_PRODUCTS requires at least one item");
            }
            validateNoDuplicateVariants(newItems);

            if (order.isToPrepare()) {
                adjustCommittedStock(order, newItems);
            }

            order.updateItems(buildItemsFromRequest(newItems, companyId));
            order.setSalesType(SalesType.WITH_PRODUCTS);
            order.setQuickSaleAmount(null);
            order.setCustomer(customer);
        }

        order.recalculateTotal();
        Order saved = orderRepository.save(order);
        return OrderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse confirm(Long id) {
        Order order = findOrderAndValidateAccess(id);

        if (!order.canConfirm()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only LOCAL_PICKUP draft orders can be confirmed. Current status: " + order.getStatus()
                            + ", deliveryType: " + order.getDeliveryType());
        }

        if (order.requiresStockValidation()) {
            deductStock(order);
        }

        order.confirm();
        orderRepository.save(order);
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse prepare(Long id) {
        Order order = findOrderAndValidateAccess(id);

        if (!order.canPrepare()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only SHIPPING draft orders can be prepared. Current status: " + order.getStatus()
                            + ", deliveryType: " + order.getDeliveryType());
        }

        if (order.requiresStockValidation()) {
            deductStock(order);
        }

        order.prepare();
        orderRepository.save(order);
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse ship(Long id) {
        Order order = findOrderAndValidateAccess(id);

        if (!order.canShip()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only SHIPPING orders in TO_PREPARE can be shipped. Current status: " + order.getStatus()
                            + ", deliveryType: " + order.getDeliveryType());
        }

        order.ship();
        orderRepository.save(order);
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse cancel(Long id) {
        Order order = findOrderAndValidateAccess(id);

        if (!order.canCancel()) {
            throw new InvalidOrderStatusTransitionException(
                    "Cannot cancel order in status: " + order.getStatus());
        }

        if (order.isConfirmed() || order.isToPrepare()) {
            returnStock(order);
        }

        order.cancel();
        orderRepository.save(order);
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse returnOrder(Long id) {
        Order order = findOrderAndValidateAccess(id);

        if (!order.canReturn()) {
            throw new InvalidOrderStatusTransitionException(
                    "Only CONFIRMED or SHIPPED orders can be returned. Current status: " + order.getStatus());
        }

        returnStock(order);

        // TODO: resolver el impacto financiero mediante el módulo de CustomerAccount / Payment / PaymentAllocation
        // cuando exista. La devolución debe revertir las asignaciones del pedido y el saldo fiado asociado.
        // No modificar directamente un saldo global del cliente desde OrderService.

        order.returnOrder();
        orderRepository.save(order);
        return OrderMapper.toResponse(order);
    }

    private Order findOrderAndValidateAccess(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        return orderRepository.findByIdAndCompanyId(id, companyId)
                .filter(order -> order.getBranch() != null
                        && isUserAssignedToBranch(userId, order.getBranch().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
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

    private void deductStock(Order order) {
        for (OrderItem item : order.getItems()) {
            Stock stock = findStockForUpdate(order, item);
            int previousQuantity = stock.getQuantity();
            if (previousQuantity < item.getQuantity()) {
                throw new InsufficientStockForEditException(
                        "Insufficient stock for variant id: " + item.getProductVariant().getId()
                                + ". Current quantity: " + previousQuantity
                                + ", requested: " + item.getQuantity());
            }
            stock.setQuantity(previousQuantity - item.getQuantity());
            saveMovement(stock, StockMovementType.SALE, -item.getQuantity(), previousQuantity, order.getId());
        }
    }

    private void returnStock(Order order) {
        for (OrderItem item : order.getItems()) {
            Stock stock = findStockForUpdate(order, item);
            int previousQuantity = stock.getQuantity();
            stock.setQuantity(previousQuantity + item.getQuantity());
            saveMovement(stock, StockMovementType.RETURN, item.getQuantity(), previousQuantity, order.getId());
        }
    }

    private void adjustCommittedStock(Order order, List<OrderItemRequest> newItems) {
        Long branchId = order.getBranch().getId();

        Map<Long, Integer> oldQuantities = new HashMap<>();
        for (OrderItem item : order.getItems()) {
            oldQuantities.put(item.getProductVariant().getId(), item.getQuantity());
        }

        Map<Long, Integer> newQuantities = new LinkedHashMap<>();
        for (OrderItemRequest itemRequest : newItems) {
            newQuantities.put(itemRequest.productVariantId(), itemRequest.quantity());
        }

        Set<Long> variantIds = new LinkedHashSet<>();
        variantIds.addAll(oldQuantities.keySet());
        variantIds.addAll(newQuantities.keySet());

        for (Long variantId : variantIds) {
            int oldQuantity = oldQuantities.getOrDefault(variantId, 0);
            int newQuantity = newQuantities.getOrDefault(variantId, 0);
            int delta = newQuantity - oldQuantity;

            if (delta == 0) {
                continue;
            }

            Stock stock = stockRepository
                    .findByProductVariantIdAndBranchIdForUpdate(variantId, branchId)
                    .orElseThrow(() -> new StockNotFoundException(variantId.toString(), branchId));

            int previousQuantity = stock.getQuantity();

            if (delta > 0) {
                if (previousQuantity < delta) {
                    throw new InsufficientStockForEditException(
                            "Insufficient stock to increase variant id: " + variantId
                                    + ". Current quantity: " + previousQuantity
                                    + ", additional requested: " + delta);
                }
                stock.setQuantity(previousQuantity - delta);
                saveMovement(stock, StockMovementType.SALE, -delta, previousQuantity, order.getId());
            } else {
                stock.setQuantity(previousQuantity - delta);
                saveMovement(stock, StockMovementType.RETURN, -delta, previousQuantity, order.getId());
            }
        }
    }

    private Stock findStockForUpdate(Order order, OrderItem item) {
        return stockRepository
                .findByProductVariantIdAndBranchIdForUpdate(
                        item.getProductVariant().getId(), order.getBranch().getId())
                .orElseThrow(() -> new StockNotFoundException(
                        item.getProductVariant().getId().toString(), order.getBranch().getId()));
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