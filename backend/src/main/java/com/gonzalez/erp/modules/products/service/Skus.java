package com.gonzalez.erp.modules.products.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;

/** Esquema de los SKU que genera el backend: lo usan el alta de productos y la importación. */
public final class Skus {

    private Skus() {}

    /** "SKU-" + 2 letras del nombre y de cada valor, sin tildes: "Remera", M, Rojo → SKU-RE-M-RO. */
    public static String base(String productName, List<String> valueNames) {
        List<String> parts = new ArrayList<>();
        parts.add(part(productName));
        valueNames.forEach(valueName -> parts.add(part(valueName)));
        parts.removeIf(String::isEmpty);

        return parts.isEmpty() ? "SKU" : "SKU-" + String.join("-", parts);
    }

    /** La base o, si está tomada, la primera libre de base-2, base-3… */
    public static String firstFree(String base, Predicate<String> taken) {
        String candidate = base;
        int suffix = 2;
        while (taken.test(candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private static String part(String value) {
        String letters = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]", "");
        return letters.substring(0, Math.min(2, letters.length())).toUpperCase(Locale.ROOT);
    }
}
