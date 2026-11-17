package com.gonzalez.erp.modules.mercadopago.mail;

/**
 * Pedido de avisar que la cuenta de Mercado Pago se desconectó. Se publica dentro de la
 * transacción y sale recién después del commit: si la transacción falla, no hay aviso de algo
 * que no pasó.
 */
public record MercadoPagoReconnectRequiredMail(String to, String firstName, String companyName) {
}
