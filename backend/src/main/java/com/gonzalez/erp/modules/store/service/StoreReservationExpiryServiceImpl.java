package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderChannel;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.orders.service.OrderService;
import com.gonzalez.erp.modules.store.mail.StoreOrderMails;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * El margen deja terminar los pagos que estaban en curso cuando venció el link: un pago aprobado
 * que llega igual después de cancelar se devuelve solo (webhook, paso 4c).
 * Cada pedido va en su propia transacción: uno que falla no frena a los demás, y no queda una
 * transacción larga con muchos pedidos y stocks bloqueados.
 */
@Slf4j
@Service
public class StoreReservationExpiryServiceImpl implements StoreReservationExpiryService {

    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final StoreOrderMails orderMails;
    private final TransactionTemplate transaction;
    private final Duration grace;

    public StoreReservationExpiryServiceImpl(
            OrderRepository orderRepository,
            OrderService orderService,
            StoreOrderMails orderMails,
            TransactionTemplate transaction,
            @Value("${app.store.expiry-grace}") Duration grace) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.orderMails = orderMails;
        this.transaction = transaction;
        this.grace = grace;
    }

    @Override
    public int expireOverdueOrders() {
        Instant cutoff = Instant.now().minus(grace);
        List<Long> ids = orderRepository.findExpiredWebOrderIds(cutoff);
        int expired = 0;
        for (Long id : ids) {
            try {
                if (Boolean.TRUE.equals(transaction.execute(status -> expire(id, cutoff)))) {
                    expired++;
                }
            } catch (RuntimeException e) {
                log.error("Could not expire the reservation of web order {}", id, e);
            }
        }
        if (expired > 0) {
            log.info("Expired {} unpaid web orders", expired);
        }
        return expired;
    }

    private boolean expire(Long id, Instant cutoff) {
        // Se vuelve a mirar con el pedido bloqueado: el pago o el comprador pudieron ganarle a la tarea.
        Order order = orderRepository.findByIdForUpdate(id).orElse(null);
        if (order == null
                || order.getChannel() != OrderChannel.WEB
                || order.getStatus() != OrderStatus.PENDING_PAYMENT
                || order.getPaymentExpiresAt() == null
                || !order.getPaymentExpiresAt().isBefore(cutoff)) {
            return false;
        }
        orderService.cancelUnpaidWebOrder(order);
        orderMails.expired(order);
        return true;
    }
}
