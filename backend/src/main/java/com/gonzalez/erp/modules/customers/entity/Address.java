package com.gonzalez.erp.modules.customers.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "addresses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address extends BaseEntity {

    /** Nombre corto para reconocerla al elegirla (Casa, Oficina, Depósito). */
    @Column(length = 50)
    private String label;

    @Column(length = 150)
    private String street;

    @Column(length = 20)
    private String number;

    @Column(length = 20)
    private String apartment;

    @Column(length = 20)
    private String floor;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String postalCode;

    @Column(length = 100)
    private String country;

    @Column(length = 200)
    private String reference;

    /** La gestiona Customer: cada cliente tiene a lo sumo una principal, y siempre activa. */
    @Column(name = "main_address", nullable = false)
    @Builder.Default
    private boolean mainAddress = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    public void update(String label, String street, String number, String apartment, String floor,
                       String city, String state, String postalCode, String country,
                       String reference) {
        this.label = label;
        this.street = street;
        this.number = number;
        this.apartment = apartment;
        this.floor = floor;
        this.city = city;
        this.state = state;
        this.postalCode = postalCode;
        this.country = country;
        this.reference = reference;
    }

    /** Usar Customer.deactivateAddress, que reasigna la principal si hace falta. */
    void deactivate() {
        this.active = false;
        this.mainAddress = false;
    }

    /** Usar Customer.activateAddress. */
    void activate() {
        this.active = true;
    }

    void markAsMain() {
        this.mainAddress = true;
    }

    void removeAsMain() {
        this.mainAddress = false;
    }
}
