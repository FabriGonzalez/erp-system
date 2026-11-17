package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.common.crypto.AesGcmTokenCipher;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoOAuthClient;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoOAuthClient.Tokens;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoProperties;
import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnection;
import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnectionStatus;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import com.gonzalez.erp.modules.mercadopago.mail.MercadoPagoReconnectRequiredMail;
import com.gonzalez.erp.modules.mercadopago.repository.MercadoPagoConnectionRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MercadoPagoTokenRenewalServiceImpl implements MercadoPagoTokenRenewalService {

    // Los tokens duran 180 días: con 30 de margen y una pasada por día, un Mercado Pago caído
    // tiene un mes de reintentos antes de que el token venza.
    private static final Duration RENEW_BEFORE = Duration.ofDays(30);

    private final MercadoPagoProperties properties;
    private final MercadoPagoOAuthClient oauthClient;
    private final AesGcmTokenCipher tokenCipher;
    private final MercadoPagoConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void renewExpiringTokens() {
        if (!properties.enabled()) {
            return;
        }
        List<Long> ids = connectionRepository.findIdsByStatusExpiringBefore(
                MercadoPagoConnectionStatus.CONNECTED, Instant.now().plus(RENEW_BEFORE));
        for (Long id : ids) {
            // Una transacción por conexión: si una empresa falla, las demás se renuevan igual.
            try {
                transactionTemplate.executeWithoutResult(status -> renew(id));
            } catch (RuntimeException e) {
                log.error("Could not renew the Mercado Pago connection {}", id, e);
            }
        }
    }

    private void renew(Long id) {
        MercadoPagoConnection connection = connectionRepository.findById(id).orElse(null);
        // Pudo desconectarse o reconectarse entre la búsqueda y ahora.
        if (connection == null || connection.isReconnectRequired()) {
            return;
        }
        Instant now = Instant.now();
        Tokens tokens;
        try {
            tokens = oauthClient.refresh(tokenCipher.decrypt(connection.getRefreshTokenEncrypted()));
        } catch (MercadoPagoException e) {
            if (e.isRejected() || connection.isExpired(now)) {
                requireReconnect(connection);
            } else {
                log.warn("Mercado Pago did not answer the renewal of connection {}; retrying on the next run", id);
            }
            return;
        } catch (IllegalArgumentException e) {
            // El token guardado no se puede descifrar (cambió la clave): no hay con qué renovar.
            log.error("The refresh token of connection {} cannot be decrypted", id);
            requireReconnect(connection);
            return;
        }
        connection.renew(
                tokenCipher.encrypt(tokens.accessToken()),
                tokenCipher.encrypt(tokens.refreshToken()),
                now.plusSeconds(tokens.expiresInSeconds()),
                now);
    }

    private void requireReconnect(MercadoPagoConnection connection) {
        connection.requireReconnect();
        log.warn("Mercado Pago connection {} needs to be reconnected", connection.getId());
        // Solo a quien la conectó, si sigue activo y tiene email. Si no, queda el cartel del panel.
        if (connection.getConnectedByUserId() == null) {
            return;
        }
        userRepository.findById(connection.getConnectedByUserId())
                .filter(User::isActive)
                .filter(user -> user.getEmail() != null && !user.getEmail().isBlank())
                .ifPresent(user -> eventPublisher.publishEvent(new MercadoPagoReconnectRequiredMail(
                        user.getEmail(), user.getFirstName(), connection.getCompany().getName())));
    }
}
