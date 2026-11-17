package com.gonzalez.erp.modules.customers.entity;

import com.gonzalez.erp.modules.customers.exception.InvalidCustomerAddressException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CustomerTest {

    @Test
    void firstAddressBecomesMainEvenIfNotRequested() {
        Customer customer = customer();
        Address first = address(1L);

        customer.addAddress(first, false);

        assertThat(first.isMainAddress()).isTrue();
        assertThat(first.getCustomer()).isSameAs(customer);
    }

    @Test
    void addingAnotherAddressKeepsMainUnlessRequested() {
        Customer customer = customer();
        Address first = address(1L);
        Address second = address(2L);
        Address third = address(3L);
        customer.addAddress(first, false);

        customer.addAddress(second, false);
        assertThat(customer.findMainAddress()).contains(first);

        customer.addAddress(third, true);
        assertThat(customer.findMainAddress()).contains(third);
        assertThat(first.isMainAddress()).isFalse();
    }

    @Test
    void deactivatingMainPromotesOldestActiveAddress() {
        Customer customer = customer();
        Address first = address(1L);
        Address second = address(2L);
        Address third = address(3L);
        customer.addAddress(first, false);
        customer.addAddress(second, false);
        customer.addAddress(third, true);

        customer.deactivateAddress(third);

        assertThat(third.isActive()).isFalse();
        assertThat(third.isMainAddress()).isFalse();
        assertThat(customer.findMainAddress()).contains(first);
    }

    @Test
    void deactivatingLastAddressLeavesNoMainAndReactivatingRestoresIt() {
        Customer customer = customer();
        Address only = address(1L);
        customer.addAddress(only, false);

        customer.deactivateAddress(only);
        assertThat(customer.findMainAddress()).isEmpty();

        customer.activateAddress(only);
        assertThat(customer.findMainAddress()).contains(only);
    }

    @Test
    void reactivatingDoesNotStealMainFromAnotherAddress() {
        Customer customer = customer();
        Address first = address(1L);
        Address second = address(2L);
        customer.addAddress(first, false);
        customer.addAddress(second, false);
        customer.deactivateAddress(first);
        assertThat(customer.findMainAddress()).contains(second);

        customer.activateAddress(first);

        assertThat(customer.findMainAddress()).contains(second);
        assertThat(first.isMainAddress()).isFalse();
    }

    @Test
    void inactiveAddressCannotBeMain() {
        Customer customer = customer();
        Address first = address(1L);
        Address second = address(2L);
        customer.addAddress(first, false);
        customer.addAddress(second, false);
        customer.deactivateAddress(second);

        assertThatThrownBy(() -> customer.makeMain(second))
                .isInstanceOf(InvalidCustomerAddressException.class);
        assertThat(customer.findMainAddress()).contains(first);
    }

    private Customer customer() {
        return Customer.builder().firstName("María").build();
    }

    private Address address(Long id) {
        Address address = Address.builder().street("Calle " + id).city("CABA").build();
        address.setId(id);
        return address;
    }
}
