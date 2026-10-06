package com.gonzalez.erp.modules.orders.dto.request;

public record OrderCancelRequest(
        RefundAction refundAction
) {}
