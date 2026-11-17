package com.gonzalez.erp.modules.products.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Locale;

/**
 * Muestra de color de un valor de atributo: colores en orden, el primero es el primario.
 * La misma forma viaja en el request, en la respuesta del ERP y en la tienda.
 */
public record ColorSwatch(
        @NotEmpty(message = "Swatch must have at least one color")
        @Size(max = ColorSwatch.MAX_COLORS, message = "Swatch must not exceed 5 colors")
        List<@NotNull(message = "Swatch colors must not be null")
             @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Swatch colors must be hex like #1A2B3C")
             String> colors
) {
    public static final int MAX_COLORS = 5;

    /** Lo que se guarda en la columna: null si no hay muestra, colores en mayúsculas si hay. */
    public static List<String> toColumn(ColorSwatch swatch) {
        if (swatch == null) {
            return null;
        }
        return swatch.colors().stream().map(color -> color.toUpperCase(Locale.ROOT)).toList();
    }

    public static ColorSwatch fromColumn(List<String> colors) {
        return colors == null || colors.isEmpty() ? null : new ColorSwatch(List.copyOf(colors));
    }
}
