package com.gonzalez.erp.modules.customers.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerAddressException;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Entity
@Table(name = "customers", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_customer_company_document",
                columnNames = {"company_id", "document_type", "document_number"}
        )
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer extends BaseEntity {

    @Column(length = 100)
    private String firstName;

    @Column(length = 100)
    private String lastName;

    @Column(length = 30)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(name = "document_type", length = 20)
    private String documentType;

    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL, orphanRemoval = false)
    @Builder.Default
    private List<Address> addresses = new ArrayList<>();

    public void update(String firstName, String lastName, String phone, String email,
                       String documentType, String documentNumber, String observations) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.email = email;
        this.documentType = documentType;
        this.documentNumber = documentNumber;
        this.observations = observations;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    // Regla de direcciones: mientras el cliente tenga alguna activa, exactamente una
    // de ellas es la principal. Por eso los cambios pasan por estos métodos.

    /** La primera dirección activa queda como principal aunque no se pida. */
    public void addAddress(Address address, boolean makeMain) {
        address.setCustomer(this);
        this.addresses.add(address);
        if (makeMain || findMainAddress().isEmpty()) {
            makeMain(address);
        }
    }

    public void makeMain(Address target) {
        if (!target.isActive()) {
            throw new InvalidCustomerAddressException("An inactive address cannot be the main address");
        }
        for (Address address : addresses) {
            if (address == target) {
                address.markAsMain();
            } else {
                address.removeAsMain();
            }
        }
    }

    public void deactivateAddress(Address address) {
        address.deactivate();
        ensureMainAddress();
    }

    public void activateAddress(Address address) {
        address.activate();
        ensureMainAddress();
    }

    public Optional<Address> findMainAddress() {
        return addresses.stream()
                .filter(address -> address.isActive() && address.isMainAddress())
                .findFirst();
    }

    /** Si no queda principal activa, pasa a serlo la activa más antigua. */
    private void ensureMainAddress() {
        if (findMainAddress().isPresent()) {
            return;
        }
        addresses.stream()
                .filter(Address::isActive)
                .min(Comparator.comparing(Address::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .ifPresent(this::makeMain);
    }
}
