package com.gonzalez.erp.modules.store.mail;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderPromo;
import com.gonzalez.erp.modules.orders.entity.OrderPromoComponent;
import com.gonzalez.erp.modules.orders.event.WebOrderPaidEvent;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.shipments.entity.Shipment;
import com.gonzalez.erp.modules.shipments.repository.ShipmentRepository;
import com.gonzalez.erp.modules.store.dto.StoreProductResponse;
import com.gonzalez.erp.modules.store.entity.StoreAccount;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.service.StoreProductViews;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Mails de los pedidos de la tienda. Corre dentro de la transacción de quien cambió el pedido:
 * lee lo que el mail necesita y publica un StoreMailEvent, que sale recién después del commit.
 * El pago lo avisa el módulo de pedidos con un evento, así que pedidos y Mercado Pago no
 * dependen de la tienda.
 */
@Component
@RequiredArgsConstructor
public class StoreOrderMails {

    private final StoreAccountRepository accountRepository;
    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final ApplicationEventPublisher events;

    @EventListener
    public void onPaid(WebOrderPaidEvent event) {
        Order order = event.order();
        accountOf(order).ifPresent(account -> {
            Company store = order.getCompany();
            events.publishEvent(new StoreMailEvent.OrderConfirmed(
                    account.getEmail(), firstNameOf(account), store.getName(), store.getStoreDomain(),
                    store.getStoreMailFrom(), order.getId(), order.getOrderNumber(), linesOf(order),
                    order.getTotal(), deliveryOf(order)));
        });
    }

    /** La reserva venció y el pedido ya está cancelado. */
    public void expired(Order order) {
        accountOf(order).ifPresent(account -> {
            Company store = order.getCompany();
            events.publishEvent(new StoreMailEvent.OrderExpired(
                    account.getEmail(), firstNameOf(account), store.getName(), store.getStoreDomain(),
                    store.getStoreMailFrom(), order.getId(), order.getOrderNumber()));
        });
    }

    // Un pedido web siempre tiene la ficha de una cuenta; si no, no hay a quién escribirle.
    private Optional<StoreAccount> accountOf(Order order) {
        if (order.getCustomer() == null) {
            return Optional.empty();
        }
        return accountRepository.findByCustomerId(order.getCustomer().getId());
    }

    private List<StoreMailEvent.Line> linesOf(Order order) {
        List<Long> ids = List.of(order.getId());
        List<StoreMailEvent.Line> lines = new ArrayList<>();
        orderRepository.findItemsWithProductByOrderIdIn(ids).forEach(item ->
                lines.add(new StoreMailEvent.Line(nameOf(item.getProductVariant()), item.getQuantity(), List.of())));

        // Llegan ordenados por promo: se agrupan conservando ese orden.
        Map<OrderPromo, List<OrderPromoComponent>> byPromo = orderRepository.findPromoComponentsWithProductByOrderIdIn(ids)
                .stream()
                .collect(Collectors.groupingBy(OrderPromoComponent::getOrderPromo, LinkedHashMap::new, Collectors.toList()));
        byPromo.forEach((promo, components) -> lines.add(new StoreMailEvent.Line(
                promo.getName(),
                promo.getQuantity(),
                components.stream()
                        .map(c -> new StoreMailEvent.Line(nameOf(c.getProductVariant()), c.getQuantity(), List.of()))
                        .toList())));
        return lines;
    }

    // "Remera (Negro, M)": el producto con los valores de sus atributos.
    private static String nameOf(ProductVariant variant) {
        String values = StoreProductViews.attributesOf(variant).stream()
                .map(StoreProductResponse.Attribute::value)
                .collect(Collectors.joining(", "));
        String name = variant.getProduct().getName();
        return values.isEmpty() ? name : name + " (" + values + ")";
    }

    private StoreMailEvent.Delivery deliveryOf(Order order) {
        boolean multipleBranches = !order.isStockReserved();
        if (order.getDeliveryType() == DeliveryType.LOCAL_PICKUP) {
            Branch branch = order.getBranch();
            String place = isBlank(branch.getAddress()) ? branch.getName() : branch.getName() + " (" + branch.getAddress() + ")";
            return new StoreMailEvent.Delivery(true, place, multipleBranches);
        }
        String place = shipmentRepository.findByOrderId(order.getId())
                .map(StoreOrderMails::addressOf)
                .orElse("la dirección que elegiste");
        return new StoreMailEvent.Delivery(false, place, multipleBranches);
    }

    // "Tucumán 10, piso 2 dto. B, CABA, Buenos Aires (CP 1049)"
    private static String addressOf(Shipment shipment) {
        String street = join(" ", shipment.getStreet(), shipment.getNumber());
        String unit = join(" ",
                isBlank(shipment.getFloor()) ? null : "piso " + shipment.getFloor(),
                isBlank(shipment.getApartment()) ? null : "dto. " + shipment.getApartment());
        String postalCode = isBlank(shipment.getPostalCode()) ? null : "(CP " + shipment.getPostalCode() + ")";
        return join(" ", join(", ", street, unit, shipment.getCity(), shipment.getState()), postalCode);
    }

    private static String join(String separator, String... parts) {
        return Stream.of(parts).filter(part -> !isBlank(part)).collect(Collectors.joining(separator));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String firstNameOf(StoreAccount account) {
        return Objects.requireNonNullElse(account.getCustomer().getFirstName(), "");
    }
}
