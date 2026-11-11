package com.gonzalez.erp.modules.mercadopago.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Avisos de Mercado Pago para el admin de la empresa. Texto plano y desde MAIL_FROM: es un aviso
 * de la plataforma, no de la tienda. Sin link porque el panel de la tienda todavía no existe.
 */
@Slf4j
@Component
public class MercadoPagoMailSender {

    private final JavaMailSender mailSender;
    private final String from;

    public MercadoPagoMailSender(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void send(MercadoPagoReconnectRequiredMail mail) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(mail.to());
        message.setSubject("Reconectá Mercado Pago para seguir cobrando en la tienda");
        String greeting = mail.firstName() == null || mail.firstName().isBlank() ? "Hola:" : "Hola " + mail.firstName() + ":";
        message.setText("""
                %s

                La cuenta de Mercado Pago de %s se desconectó y la tienda no puede cobrar hasta \
                que la vuelvas a conectar.

                Entrá al panel de la tienda y tocá "Conectar Mercado Pago". Si sacaste el permiso \
                desde tu cuenta de Mercado Pago, al reconectar se lo das de nuevo.
                """.formatted(greeting, mail.companyName()));
        try {
            mailSender.send(message);
        } catch (MailException e) {
            log.error("Could not send the Mercado Pago reconnect mail for company {}", mail.companyName(), e);
        }
    }
}
