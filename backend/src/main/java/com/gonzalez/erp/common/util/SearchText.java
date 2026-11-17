package com.gonzalez.erp.common.util;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Texto de búsqueda de los listados: las consultas comparan contra columnas pasadas a
 * minúsculas y sin tildes con translate(), así que el texto tiene que llegar igual.
 */
public final class SearchText {

    private SearchText() {}

    /** Minúsculas, sin tildes y con los espacios colapsados; null si no hay nada que buscar. */
    public static String normalize(String search) {
        if (search == null) {
            return null;
        }
        String collapsed = search.trim().replaceAll("\\s+", " ");
        if (collapsed.isEmpty()) {
            return null;
        }
        return Normalizer.normalize(collapsed.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }

    /** Patrón LIKE "contiene" para un texto ya normalizado; "%" si no hay búsqueda. */
    public static String containsPattern(String normalized) {
        return normalized == null ? "%" : "%" + normalized + "%";
    }
}
