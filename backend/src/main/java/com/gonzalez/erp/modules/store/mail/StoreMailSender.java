package com.gonzalez.erp.modules.store.mail;

import jakarta.mail.internet.InternetAddress;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.nio.charset.StandardCharsets;

/**
 * Manda los mails de la tienda después del commit y en otro hilo:
 * - después del commit: si la transacción falla, no sale un mail de algo que no pasó;
 * - en otro hilo: el request no espera al SMTP, y la respuesta tarda lo mismo mande o no mail
 *   (si no, midiendo el tiempo se sabría qué emails tienen cuenta).
 * Si el envío falla queda en el log y el comprador puede pedir el reenvío.
 */
@Slf4j
@Component
public class StoreMailSender {

    private final JavaMailSender mailSender;
    private final String from;
    private final String linkScheme;
    private final String linkPort;

    public StoreMailSender(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String from,
            @Value("${app.store.link-scheme}") String linkScheme,
            @Value("${app.store.link-port:}") String linkPort) {
        this.mailSender = mailSender;
        this.from = from;
        this.linkScheme = linkScheme;
        this.linkPort = linkPort;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void send(StoreMailEvent event) {
        StoreMailTemplates.Mail mail = switch (event) {
            case StoreMailEvent.Verification v ->
                    StoreMailTemplates.verification(v, storeUrl(v) + "/cuenta/verificar?token=" + v.token());
            case StoreMailEvent.AlreadyRegistered a -> StoreMailTemplates.alreadyRegistered(a, storeUrl(a));
            case StoreMailEvent.PasswordReset r ->
                    StoreMailTemplates.passwordReset(r, storeUrl(r) + "/cuenta/restablecer?token=" + r.token());
            case StoreMailEvent.PasswordChanged c -> StoreMailTemplates.passwordChanged(c, storeUrl(c));
        };
        try {
            mailSender.send(message -> {
                MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
                String sender = event.storeMailFrom() != null ? event.storeMailFrom() : from;
                helper.setFrom(new InternetAddress(sender, event.storeName(), StandardCharsets.UTF_8.name()));
                helper.setTo(event.to());
                helper.setSubject(mail.subject());
                helper.setText(mail.text(), mail.html());
            });
        } catch (MailException e) {
            // Sin el email en el log: alcanza con la tienda y el tipo para investigar.
            log.error("Could not send {} mail for store {}", event.getClass().getSimpleName(), event.storeDomain(), e);
        }
    }

    // El dominio ya está validado como hostname (StoreDomains): no puede traer ruta ni otra URL.
    private String storeUrl(StoreMailEvent event) {
        String port = linkPort == null || linkPort.isBlank() ? "" : ":" + linkPort.trim();
        return linkScheme + "://" + event.storeDomain() + port;
    }
}
