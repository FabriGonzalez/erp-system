package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Filtro de valores de atributo de los listados de productos y de stock: una variante coincide
 * si tiene, de cada atributo involucrado, alguno de los valores pedidos.
 */
public final class AttributeValueFilters {

    private AttributeValueFilters() {}

    /**
     * Valores pedidos (sin repetidos) y cuántos atributos distintos abarcan. Sin filtro, ids trae
     * un id que no existe: IN no acepta listas vacías.
     */
    public record Resolved(boolean active, List<Long> ids, long attributeCount) {}

    /** Un valor de otra empresa (o inexistente) es un 404, así el filtro nunca se descarta en silencio. */
    public static Resolved resolve(List<Long> attributeValueIds, Long companyId,
                                   ProductAttributeValueRepository repository) {
        List<Long> ids = attributeValueIds == null
                ? List.of()
                : attributeValueIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return new Resolved(false, List.of(-1L), 0);
        }
        // El catálogo de valores es chico: se trae entero con su atributo en una consulta.
        Map<Long, Long> attributeByValue = repository.findAllByCompanyIdWithAttribute(companyId, null).stream()
                .collect(Collectors.toMap(ProductAttributeValue::getId, value -> value.getAttribute().getId()));
        if (!attributeByValue.keySet().containsAll(ids)) {
            throw new ResourceNotFoundException("Attribute value not found");
        }
        return new Resolved(true, ids, ids.stream().map(attributeByValue::get).distinct().count());
    }
}
