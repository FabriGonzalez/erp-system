package com.gonzalez.erp.common.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifra secretos que hay que poder leer de nuevo (tokens de terceros, certificados).
 *
 * AES-256-GCM: además de ocultar el texto, detecta si alguien lo modificó (el tag de 128 bits).
 * Formato: "v1:" + base64url(IV de 12 bytes + texto cifrado con el tag). La versión permite
 * cambiar la clave más adelante sin perder lo que ya está guardado.
 *
 * Sin APP_ENCRYPTION_KEY el bean igual se crea (el ERP no la necesita si no usa integraciones);
 * falla recién al cifrar o descifrar.
 */
@Component
public class AesGcmTokenCipher {

    private static final String VERSION_PREFIX = "v1:";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;
    private static final int KEY_LENGTH = 32;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public AesGcmTokenCipher(@Value("${app.encryption.key:}") String base64Key) {
        this.key = base64Key == null || base64Key.isBlank() ? null : toKey(base64Key.trim());
    }

    public String encrypt(String plainText) {
        byte[] iv = new byte[IV_LENGTH];
        random.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, requireKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            byte[] payload = ByteBuffer.allocate(IV_LENGTH + encrypted.length).put(iv).put(encrypted).array();
            return VERSION_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt", e);
        }
    }

    /** Falla con {@link IllegalArgumentException} si el texto fue alterado o no lo cifró esta clave. */
    public String decrypt(String cipherText) {
        if (cipherText == null || !cipherText.startsWith(VERSION_PREFIX)) {
            throw new IllegalArgumentException("Unknown cipher text format");
        }
        SecretKeySpec currentKey = requireKey();
        try {
            byte[] payload = Base64.getUrlDecoder().decode(cipherText.substring(VERSION_PREFIX.length()));
            if (payload.length <= IV_LENGTH) {
                throw new IllegalArgumentException("Cipher text is too short");
            }
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, currentKey, new GCMParameterSpec(TAG_BITS, payload, 0, IV_LENGTH));
            byte[] plain = cipher.doFinal(payload, IV_LENGTH, payload.length - IV_LENGTH);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException e) {
            // Tag inválido: el texto fue alterado o es de otra clave.
            throw new IllegalArgumentException("Cipher text could not be decrypted", e);
        }
    }

    private SecretKeySpec requireKey() {
        if (key == null) {
            throw new IllegalStateException("APP_ENCRYPTION_KEY is not configured");
        }
        return key;
    }

    private static SecretKeySpec toKey(String base64Key) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(base64Key);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("APP_ENCRYPTION_KEY must be base64", e);
        }
        if (bytes.length != KEY_LENGTH) {
            throw new IllegalStateException("APP_ENCRYPTION_KEY must be 32 bytes (base64 of 32 random bytes)");
        }
        return new SecretKeySpec(bytes, "AES");
    }
}
