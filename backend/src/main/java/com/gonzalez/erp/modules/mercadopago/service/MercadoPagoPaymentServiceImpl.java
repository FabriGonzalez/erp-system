package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.common.crypto.AesGcmTokenCipher;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoPreferenceClient;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoPreferenceClient.Preference;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoPreferenceClient.PreferenceRequest;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoProperties;
import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnection;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import com.gonzalez.erp.modules.mercadopago.repository.MercadoPagoConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MercadoPagoPaymentServiceImpl implements MercadoPagoPaymentService {

    private final MercadoPagoProperties properties;
    private final MercadoPagoConnectionRepository connectionRepository;
    private final MercadoPagoPreferenceClient preferenceClient;
    private final AesGcmTokenCipher tokenCipher;

    @Override
    public boolean canCharge(Long companyId) {
        return usableConnection(companyId).isPresent();
    }

    @Override
    public PaymentLink createPaymentLink(Long companyId, PreferenceRequest request) {
        // Solo si la conexión se cayó entre el chequeo del checkout y acá.
        MercadoPagoConnection connection = usableConnection(companyId)
                .orElseThrow(MercadoPagoException::unavailable);
        Preference preference = preferenceClient.create(tokenCipher.decrypt(connection.getAccessTokenEncrypted()), request);
        // Con una cuenta de prueba el pago se hace en el sandbox de Mercado Pago.
        String url = connection.isLiveMode() || preference.sandboxInitPoint() == null
                ? preference.initPoint()
                : preference.sandboxInitPoint();
        return new PaymentLink(preference.id(), url);
    }

    private Optional<MercadoPagoConnection> usableConnection(Long companyId) {
        if (!properties.enabled()) {
            return Optional.empty();
        }
        Instant now = Instant.now();
        return connectionRepository.findByCompanyId(companyId)
                .filter(connection -> !connection.isReconnectRequired() && !connection.isExpired(now));
    }
}
