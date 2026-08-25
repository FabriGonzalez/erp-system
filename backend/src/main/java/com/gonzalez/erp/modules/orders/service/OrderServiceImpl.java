package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.InsufficientStockException;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.orders.dto.request.OrderItemRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.mapper.OrderMapper;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final String REFERENCE_TYPE = "ORDER";

    private final OrderRepository orderRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<OrderResponse> findAll(OrderStatus status) {
        List<Order> orders = (status != null)
                ? orderRepository.findByStatus(status)
                : orderRepository.findAll();
        return orders.stream()
                .map(OrderMapper::toResponse)
                .toList();
    }

    @Override
    public OrderResponse findById(Long id) {
        Order order = findOrderOrThrow(id);
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse create(OrderRequest request) {
        Set<Long> seenProducts = new HashSet<>();
        for (OrderItemRequest item : request.items()) {
            if (!seenProducts.add(item.productId())) {
                throw new InvalidOrderException(
                        "Duplicate product in order items: " + item.productId());
            }
        }

        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Company company = companyRepository.getReferenceById(companyId);

        Order order = Order.builder()
                .branch(branchRepository.getReferenceById(request.branchId()))
                .customer(request.customerId() != null
                        ? customerRepository.findById(request.customerId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                        "Customer not found with id: " + request.customerId()))
                        : null)
                .createdBy(userRepository.getReferenceById(getCurrentUserId()))
                .status(OrderStatus.DRAFT)
                .company(company)
                .build();

        for (OrderItemRequest itemRequest : request.items()) {
            var product = productRepository.findById(itemRequest.productId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found with id: " + itemRequest.productId()));

            OrderItem item = OrderItem.builder()
                    .product(product)
                    .quantity(itemRequest.quantity())
                    .unitPrice(product.getPrice())
                    .build();
            order.addItem(item);
        }

        Order saved = orderRepository.saveAndFlush(order);
        return OrderMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse confirm(Long id) {
        Order order = findOrderOrThrow(id);

        checkStatus(order, OrderStatus.DRAFT, "confirmed");

        for (OrderItem item : order.getItems()) {
            Long productId = item.getProduct().getId();
            Long branchId = order.getBranch().getId();

            Stock stock = stockRepository
                    .findByProductIdAndBranchId(productId, branchId)
                    .orElseThrow(() -> new StockNotFoundException(productId.toString(), branchId));

            if (stock.getQuantity() < item.getQuantity()) {
                throw new InsufficientStockException(
                        stock.getId(), stock.getQuantity(), item.getQuantity());
            }
        }

        for (OrderItem item : order.getItems()) {
            Long productId = item.getProduct().getId();
            Long branchId = order.getBranch().getId();

            Stock stock = stockRepository
                    .findByProductIdAndBranchId(productId, branchId)
                    .orElseThrow(() -> new StockNotFoundException(productId.toString(), branchId));

            int previousQuantity = stock.getQuantity();
            stock.setQuantity(previousQuantity - item.getQuantity());
            stockRepository.save(stock);

            stockMovementRepository.save(StockMovement.builder()
                    .stock(stock)
                    .type(StockMovementType.SALE)
                    .quantity(-item.getQuantity())
                    .previousQuantity(previousQuantity)
                    .newQuantity(stock.getQuantity())
                    .reason(null)
                    .referenceId(order.getId())
                    .referenceType(REFERENCE_TYPE)
                    .build());
        }

        order.confirm();
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse cancel(Long id) {
        Order order = findOrderOrThrow(id);

        if (order.isCancelled()) {
            throw new InvalidOrderException(
                    "Only draft or confirmed orders can be cancelled. Current status: " + order.getStatus());
        }

        if (order.isConfirmed()) {
            for (OrderItem item : order.getItems()) {
                Long productId = item.getProduct().getId();
                Long branchId = order.getBranch().getId();

                Stock stock = stockRepository
                        .findByProductIdAndBranchId(productId, branchId)
                        .orElseThrow(() -> new StockNotFoundException(productId.toString(), branchId));

                int previousQuantity = stock.getQuantity();
                stock.setQuantity(previousQuantity + item.getQuantity());
                stockRepository.save(stock);

                stockMovementRepository.save(StockMovement.builder()
                        .stock(stock)
                        .type(StockMovementType.RETURN)
                        .quantity(item.getQuantity())
                        .previousQuantity(previousQuantity)
                        .newQuantity(stock.getQuantity())
                        .reason(null)
                        .referenceId(order.getId())
                        .referenceType(REFERENCE_TYPE)
                        .build());
            }
        }

        order.cancel();
        return OrderMapper.toResponse(order);
    }

    private Order findOrderOrThrow(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Order not found with id: " + id));
    }

    private void checkStatus(Order order, OrderStatus expected, String action) {
        if (order.getStatus() != expected) {
            throw new InvalidOrderException(
                    "Only " + expected + " orders can be " + action
                            + ". Current status: " + order.getStatus());
        }
    }

    private Long getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResourceNotFoundException("No authenticated user found");
        }

        return userDetails.getUserId();
    }
}
