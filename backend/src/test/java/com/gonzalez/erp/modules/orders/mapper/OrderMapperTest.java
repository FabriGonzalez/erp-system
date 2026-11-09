package com.gonzalez.erp.modules.orders.mapper;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderChannel;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class OrderMapperTest {

    @Test
    void aStoreOrderHasNoEmployee() {
        Branch branch = Branch.builder().name("Centro").build();
        branch.setId(10L);
        Order order = Order.builder()
                .orderNumber("ORD-1")
                .branch(branch)
                .channel(OrderChannel.WEB)
                .status(OrderStatus.PENDING_PAYMENT)
                .salesType(SalesType.WITH_PRODUCTS)
                .deliveryType(DeliveryType.LOCAL_PICKUP)
                .total(new BigDecimal("1000"))
                .build();

        OrderResponse response = OrderMapper.toResponse(order, null, BigDecimal.ZERO, null, new BigDecimal("1000"));

        assertThat(response.createdById()).isNull();
        assertThat(response.createdByUsername()).isNull();
    }
}
