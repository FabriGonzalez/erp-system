package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.common.crypto.AesGcmTokenCipher;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient.Payment;
import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnection;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import com.gonzalez.erp.modules.mercadopago.repository.MercadoPagoConnectionRepository;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderChannel;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.orders.service.OrderService;
import com.gonzalez.erp.modules.payments.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Del aviso solo se usan dos datos: qué cuenta cobró y qué pago mirar. Todo lo demás (estado,
 * pedido, importe) sale de consultar el pago a Mercado Pago con el token de esa cuenta, así que un
 * aviso inventado no puede acreditar nada.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MercadoPagoWebhookServiceImpl implements MercadoPagoWebhookService {

    private static final String CURRENCY = "ARS";

    private final MercadoPagoConnectionRepository connectionRepository;
    private final MercadoPagoCheckoutClient checkoutClient;
    private final AesGcmTokenCipher tokenCipher;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final OrderService orderService;

    @Override
    @Transactional
    public void handlePayment(long mpUserId, String paymentId) {
        // Una cuenta de Mercado Pago es de una sola empresa (4a1): el aviso dice de cuál es el pago.
        Optional<MercadoPagoConnection> connection = connectionRepository.findByMpUserId(mpUserId);
        if (connection.isEmpty()) {
            log.info("Mercado Pago notification for an account that is not connected: {}", mpUserId);
            return;
        }
        Long companyId = connection.get().getCompany().getId();
        String accessToken = tokenCipher.decrypt(connection.get().getAccessTokenEncrypted());

        Optional<Payment> found = checkoutClient.findPayment(accessToken, paymentId);
        if (found.isEmpty()) {
            log.warn("Mercado Pago payment {} not found for company {}", paymentId, companyId);
            return;
        }
        Payment payment = found.get();
        // Rechazado: el comprador puede reintentar mientras dure la reserva. Devuelto: ya se resolvió.
        if (!payment.isApproved()) {
            return;
        }

        // Bloqueado: si el comprador cancela o llega el mismo aviso dos veces, uno espera al otro.
        Optional<Order> order = MercadoPagoOrderReference.parse(payment.externalReference())
                .flatMap(orderId -> orderRepository.findByIdAndCompanyIdForUpdate(orderId, companyId))
                .filter(candidate -> candidate.getChannel() == OrderChannel.WEB);
        if (order.isEmpty()) {
            log.warn("Approved Mercado Pago payment {} does not belong to a web order of company {}", paymentId, companyId);
            return;
        }
        if (paymentRepository.existsByMpPaymentId(payment.id())) {
            return;
        }

        Order target = order.get();
        if (target.getStatus() != OrderStatus.PENDING_PAYMENT) {
            // Cancelado mientras pagaba, o pagado dos veces desde dos pestañas: la plata vuelve entera.
            refund(accessToken, payment, target);
            return;
        }
        if (!CURRENCY.equals(payment.currency()) || payment.amount() == null
                || payment.amount().compareTo(target.getTotal()) != 0) {
            log.error("Mercado Pago payment {} of order {} does not match its total: {} {} vs {}",
                    payment.id(), target.getId(), payment.amount(), payment.currency(), target.getTotal());
            return;
        }

        orderService.confirmWebOrderPayment(target, payment.id());
    }

    /**
     * Si Mercado Pago no responde, el error sube y el aviso se reintenta. Si rechaza la devolución
     * (por ejemplo, sin saldo en la cuenta del local o un pago demasiado viejo), reintentar no
     * sirve: queda un error en el log para devolverlo a mano y el aviso se da por recibido.
     */
    private void refund(String accessToken, Payment payment, Order order) {
        try {
            checkoutClient.refundPayment(accessToken, payment.id());
            log.info("Refunded Mercado Pago payment {} of order {} in status {}",
                    payment.id(), order.getId(), order.getStatus());
        } catch (MercadoPagoException e) {
            if (!e.isRejected()) {
                throw e;
            }
            log.error("MANUAL REFUND NEEDED: Mercado Pago rejected the refund of payment {} ({} {}) of order {} "
                            + "in status {}, company {}",
                    payment.id(), payment.amount(), payment.currency(), order.getId(), order.getStatus(),
                    order.getCompany().getId());
        }
    }
}
