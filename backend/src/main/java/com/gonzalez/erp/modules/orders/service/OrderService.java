package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.orders.dto.request.OrderCancelRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderChannel;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import org.springframework.data.domain.Pageable;

public interface OrderService {

    PageResponse<OrderResponse> findAll(OrderStatus status, OrderChannel channel, Long branchId, SalesType salesType,
                                        DeliveryType deliveryType, Long customerId,
                                        PaymentStatus paymentStatus, String query, Pageable pageable);

    OrderResponse findById(Long id);

    OrderResponse create(OrderRequest request);

    OrderResponse update(Long id, OrderUpdateRequest request);

    OrderResponse dispatch(Long id);

    /**
     * Cancela el pedido. Uno web ya pagado devuelve el pago entero por Mercado Pago (ignora la
     * opción de saldo a favor o efectivo); si Mercado Pago no lo devuelve, no se cancela.
     */
    OrderResponse cancel(Long id, OrderCancelRequest request);

    /**
     * Pedido web pagado que ninguna sucursal armaba sola: descuenta el stock en la sucursal
     * elegida y pasa a preparar. 409 si no está a asignar o si a esa sucursal le falta stock.
     */
    OrderResponse assignBranch(Long id, Long branchId);

    /** Pedido de la tienda, pendiente de pago. No usa la sesión del empleado ni carga la cuenta del cliente. */
    Order createWebOrder(WebOrderCommand command);

    /**
     * Cancela un pedido web todavía sin pagar y devuelve el stock reservado. Recibe el pedido ya
     * bloqueado: quién puede cancelarlo lo decide quien llama.
     */
    void cancelUnpaidWebOrder(Order order);

    /**
     * Acredita el pago de Mercado Pago de un pedido web: carga el total en la cuenta del cliente,
     * registra el pago por el mismo importe y el pedido pasa a su estado normal. Recibe el pedido
     * ya bloqueado y el pago ya validado contra Mercado Pago.
     */
    void confirmWebOrderPayment(Order order, String mpPaymentId);
}