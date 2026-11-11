package com.gonzalez.erp.common.crypto;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AesGcmTokenCipherTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);
    private static final String OTHER_KEY = Base64.getEncoder().encodeToString(new byte[] {
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
            17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32});

    private final AesGcmTokenCipher cipher = new AesGcmTokenCipher(KEY);

    @Test
    void decryptsWhatItEncrypted() {
        String encrypted = cipher.encrypt("APP_USR-secreto");

        assertThat(encrypted).startsWith("v1:").doesNotContain("APP_USR-secreto");
        assertThat(cipher.decrypt(encrypted)).isEqualTo("APP_USR-secreto");
    }

    @Test
    void theSameTextEncryptsDifferentlyEachTime() {
        // IV al azar: dos tokens iguales no se delatan en la base.
        assertThat(cipher.encrypt("igual")).isNotEqualTo(cipher.encrypt("igual"));
    }

    @Test
    void rejectsAlteredText() {
        String encrypted = cipher.encrypt("APP_USR-secreto");
        // Un carácter del medio: el último puede llevar bits de relleno que el decoder ignora.
        int middle = encrypted.length() / 2;
        char replacement = encrypted.charAt(middle) == 'A' ? 'B' : 'A';
        String altered = encrypted.substring(0, middle) + replacement + encrypted.substring(middle + 1);

        assertThatThrownBy(() -> cipher.decrypt(altered)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsTextFromAnotherKeyOrFormat() {
        String fromOtherKey = new AesGcmTokenCipher(OTHER_KEY).encrypt("APP_USR-secreto");

        assertThatThrownBy(() -> cipher.decrypt(fromOtherKey)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.decrypt("v2:abc")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.decrypt("v1:no-es-base64!")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> cipher.decrypt("v1:")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void withoutKeyFailsOnlyWhenUsed() {
        AesGcmTokenCipher withoutKey = new AesGcmTokenCipher("");

        assertThatThrownBy(() -> withoutKey.encrypt("x")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsKeysThatAreNot32Bytes() {
        String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

        assertThatThrownBy(() -> new AesGcmTokenCipher(shortKey)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new AesGcmTokenCipher("no es base64")).isInstanceOf(IllegalStateException.class);
    }
}
