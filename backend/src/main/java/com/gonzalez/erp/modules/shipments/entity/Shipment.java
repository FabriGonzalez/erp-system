package com.gonzalez.erp.modules.shipments.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.orders.entity.Order;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shipments", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_shipment_order",
                columnNames = {"order_id"}
        )
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipment extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, length = 150)
    private String street;

    @Column(length = 20)
    private String number;

    @Column(length = 20)
    private String apartment;

    @Column(length = 20)
    private String floor;

    @Column(nullable = false, length = 150)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String postalCode;

    @Column(nullable = false, length = 150)
    private String country;

    @Column(length = 200)
    private String reference;

    public void update(
            String street,
            String number,
            String apartment,
            String floor,
            String city,
            String state,
            String postalCode,
            String country,
            String reference) {

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
}
