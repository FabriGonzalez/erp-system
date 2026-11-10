package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderChannel;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderPromo;
import com.gonzalez.erp.modules.orders.entity.OrderPromoComponent;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.orders.service.OrderService;
import com.gonzalez.erp.modules.products.entity.ProductImage;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductImageRepository;
import com.gonzalez.erp.modules.shipments.entity.Shipment;
import com.gonzalez.erp.modules.shipments.repository.ShipmentRepository;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreFulfillment;
import com.gonzalez.erp.modules.store.dto.StoreOrderResponse;
import com.gonzalez.erp.modules.store.dto.StoreOrderStatus;
import com.gonzalez.erp.modules.store.dto.StoreOrderSummaryResponse;
import com.gonzalez.erp.modules.store.exception.StoreCheckoutException;
import com.gonzalez.erp.modules.store.security.StoreCustomer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * "Mis pedidos" de la tienda. El comprador sale siempre del token y cada consulta filtra por
 * empresa, cliente y canal WEB: un pedido ajeno o una venta del local cargada a su ficha dan el
 * mismo 404 que uno inexistente.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreOrderServiceImpl implements StoreOrderService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final ProductImageRepository imageRepository;
    private final OrderService orderService;
    private final StoreProductViews views;

    @Override
    public PageResponse<StoreOrderSummaryResponse> findMine(int page, int size) {
        StoreCustomer current = StoreCustomer.require();
        Page<Order> orders = orderRepository.findByCompanyIdAndCustomerIdAndChannel(
                current.companyId(), current.customerId(), OrderChannel.WEB, PageRequest.of(page, size, NEWEST_FIRST));
        if (orders.isEmpty()) {
            return PageResponse.of(orders, order -> null);
        }

        // Líneas, componentes y fotos de toda la página en tres consultas, no por pedido.
        OrderLines lines = linesOf(orders.getContent().stream().map(Order::getId).toList());
        Map<Long, List<ProductImage>> images = imagesOf(lines.productIds());
        return PageResponse.of(orders, order -> toSummary(order, lines, images));
    }

    @Override
    public StoreOrderResponse findMine(Long orderId) {
        StoreCustomer current = StoreCustomer.require();
        Order order = orderRepository.findByIdAndCompanyIdAndCustomerIdAndChannel(
                        orderId, current.companyId(), current.customerId(), OrderChannel.WEB)
                .orElseThrow(() -> notFound(orderId));
        return toResponse(order);
    }

    @Override
    @Transactional
    public StoreOrderResponse cancelMine(Long orderId) {
        StoreCustomer current = StoreCustomer.require();
        // Bloqueado: si en el paso 4 llega el pago a la vez, uno de los dos espera al otro.
        Order order = orderRepository.findByIdAndCompanyIdForUpdate(orderId, current.companyId())
                .filter(found -> found.getChannel() == OrderChannel.WEB)
                .filter(found -> found.getCustomer() != null && found.getCustomer().getId().equals(current.customerId()))
                .orElseThrow(() -> notFound(orderId));
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw StoreCheckoutException.orderNotCancellable();
        }
        orderService.cancelUnpaidWebOrder(order);
        return toResponse(order);
    }

    private StoreOrderSummaryResponse toSummary(Order order, OrderLines lines, Map<Long, List<ProductImage>> images) {
        List<OrderItem> items = lines.items().getOrDefault(order.getId(), List.of());
        List<OrderPromoComponent> components = lines.components().getOrDefault(order.getId(), List.of());

        int units = items.stream().mapToInt(OrderItem::getQuantity).sum()
                + components.stream().mapToInt(c -> c.getQuantity() * c.getOrderPromo().getQuantity()).sum();
        // La foto de la primera línea suelta o, si solo tiene promos, la del primer componente.
        ProductVariant first = !items.isEmpty() ? items.getFirst().getProductVariant()
                : !components.isEmpty() ? components.getFirst().getProductVariant()
                : null;
        String cover = first != null ? imageOf(first, images) : null;

        return new StoreOrderSummaryResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCreatedAt(),
                StoreOrderStatus.from(order.getStatus(), order.getDeliveryType()),
                order.getDeliveryType(),
                units,
                order.getTotal(),
                cover
        );
    }

    private StoreOrderResponse toResponse(Order order) {
        OrderLines lines = linesOf(List.of(order.getId()));
        Map<Long, List<ProductImage>> images = imagesOf(lines.productIds());

        List<StoreOrderResponse.Item> items = lines.items().getOrDefault(order.getId(), List.of()).stream()
                .map(item -> {
                    ProductVariant variant = item.getProductVariant();
                    return new StoreOrderResponse.Item(
                            variant.getProduct().getId(),
                            variant.getId(),
                            variant.getProduct().getName(),
                            StoreProductViews.attributesOf(variant),
                            item.getQuantity(),
                            item.getUnitPrice(),
                            item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())),
                            imageOf(variant, images));
                })
                .toList();

        // Los componentes llegan ordenados por promo: se agrupan conservando ese orden.
        Map<OrderPromo, List<OrderPromoComponent>> byPromo = lines.components().getOrDefault(order.getId(), List.of()).stream()
                .collect(Collectors.groupingBy(OrderPromoComponent::getOrderPromo, LinkedHashMap::new, Collectors.toList()));
        List<StoreOrderResponse.Promo> promos = byPromo.entrySet().stream()
                .map(entry -> {
                    OrderPromo promo = entry.getKey();
                    List<StoreOrderResponse.Component> components = entry.getValue().stream()
                            .map(component -> {
                                ProductVariant variant = component.getProductVariant();
                                return new StoreOrderResponse.Component(
                                        variant.getProduct().getId(),
                                        variant.getId(),
                                        variant.getProduct().getName(),
                                        StoreProductViews.attributesOf(variant),
                                        component.getQuantity(),
                                        imageOf(variant, images));
                            })
                            .toList();
                    return new StoreOrderResponse.Promo(
                            promo.getPromotion().getId(),
                            promo.getName(),
                            promo.getQuantity(),
                            promo.getUnitPrice(),
                            promo.getUnitPrice().multiply(BigDecimal.valueOf(promo.getQuantity())),
                            components);
                })
                .toList();

        boolean pickup = order.getDeliveryType() == DeliveryType.LOCAL_PICKUP;
        Branch branch = order.getBranch();
        return new StoreOrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCreatedAt(),
                StoreOrderStatus.from(order.getStatus(), order.getDeliveryType()),
                order.getStatus() == OrderStatus.PENDING_PAYMENT,
                order.getCancelledAt(),
                order.getDeliveryType(),
                order.isStockReserved() ? StoreFulfillment.SINGLE_BRANCH : StoreFulfillment.MULTIPLE_BRANCHES,
                pickup ? new StoreCartQuoteResponse.PickupBranch(branch.getId(), branch.getName(), branch.getAddress()) : null,
                pickup ? null : shippingAddressOf(order),
                items,
                promos,
                order.getSubtotal(),
                order.getShippingCost(),
                order.getTotal(),
                null
        );
    }

    private StoreOrderResponse.ShippingAddress shippingAddressOf(Order order) {
        return shipmentRepository.findByOrderId(order.getId())
                .map(StoreOrderServiceImpl::toShippingAddress)
                .orElse(null);
    }

    private static StoreOrderResponse.ShippingAddress toShippingAddress(Shipment shipment) {
        return new StoreOrderResponse.ShippingAddress(
                shipment.getStreet(),
                shipment.getNumber(),
                shipment.getApartment(),
                shipment.getFloor(),
                shipment.getCity(),
                shipment.getState(),
                shipment.getPostalCode(),
                shipment.getCountry(),
                shipment.getReference()
        );
    }

    /** Líneas sueltas y componentes de promo agrupados por pedido, con variante y producto ya cargados. */
    private OrderLines linesOf(Collection<Long> orderIds) {
        Map<Long, List<OrderItem>> items = orderRepository.findItemsWithProductByOrderIdIn(orderIds).stream()
                .collect(Collectors.groupingBy(item -> item.getOrder().getId()));
        Map<Long, List<OrderPromoComponent>> components = orderRepository.findPromoComponentsWithProductByOrderIdIn(orderIds).stream()
                .collect(Collectors.groupingBy(component -> component.getOrderPromo().getOrder().getId()));
        return new OrderLines(items, components);
    }

    /** Fotos de los productos comprados, aunque hoy estén despublicados: el pedido es del comprador. */
    private Map<Long, List<ProductImage>> imagesOf(Set<Long> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return imageRepository.findVisibleOfProducts(productIds).stream()
                .collect(Collectors.groupingBy(StoreProductViews::ownerProductId));
    }

    private String imageOf(ProductVariant variant, Map<Long, List<ProductImage>> images) {
        return views.variantCoverOf(images.getOrDefault(variant.getProduct().getId(), List.of()), variant.getId());
    }

    private static ResourceNotFoundException notFound(Long orderId) {
        return new ResourceNotFoundException("Order not found with id: " + orderId);
    }

    private record OrderLines(Map<Long, List<OrderItem>> items, Map<Long, List<OrderPromoComponent>> components) {
        Set<Long> productIds() {
            Set<Long> ids = new HashSet<>();
            items.values().forEach(list -> list.forEach(item -> ids.add(item.getProductVariant().getProduct().getId())));
            components.values().forEach(list -> list.forEach(c -> ids.add(c.getProductVariant().getProduct().getId())));
            return ids;
        }
    }
}
