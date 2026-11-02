package com.gonzalez.erp.modules.categories.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
        name = "categories",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_category_company_name",
                        columnNames = {"company_id", "name"}
                )
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category extends BaseEntity {

    @Size(max = 100, message = "Category name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    @Column(length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /** Los atributos que pueden usar las variantes de sus productos. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "category_attributes",
            joinColumns = @JoinColumn(name = "category_id"),
            inverseJoinColumns = @JoinColumn(name = "attribute_id")
    )
    @Builder.Default
    private Set<ProductAttribute> attributes = new HashSet<>();

    public void update(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public void replaceAttributes(Collection<ProductAttribute> attributes) {
        this.attributes.clear();
        this.attributes.addAll(attributes);
    }

    public void addAttributes(Collection<ProductAttribute> attributes) {
        this.attributes.addAll(attributes);
    }

    public boolean allowsAttribute(Long attributeId) {
        return attributes.stream().anyMatch(attribute -> attribute.getId().equals(attributeId));
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
