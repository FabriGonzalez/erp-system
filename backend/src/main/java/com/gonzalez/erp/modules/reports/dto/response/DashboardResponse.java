package com.gonzalez.erp.modules.reports.dto.response;

import com.gonzalez.erp.modules.payments.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Resumen del dashboard para [from, to) sobre las sucursales asignadas al usuario (o solo
 * branchId); previousSales es [previousFrom, previousTo). La deuda es de toda la empresa y los
 * pedidos por despachar son la foto actual: ninguno de los dos depende del rango.
 */
public record DashboardResponse(
        Instant from,
        Instant to,
        Instant previousFrom,
        Instant previousTo,
        Long branchId,
        SalesSummary sales,
        SalesSummary previousSales,
        List<BranchSales> salesByBranch,
        CollectionsSummary collections,
        DebtSummary debt,
        List<TopProduct> topProducts,
        PendingOrders pendingOrders,
        LowStock lowStock
) {

    public record SalesSummary(long orderCount, BigDecimal total, BigDecimal averageTicket) {
    }

    public record BranchSales(Long branchId, String branchName, long orderCount, BigDecimal total) {
    }

    /** Pagos vigentes por medio (todos los medios, en cero si no hubo) y ventas sin cliente aparte. */
    public record CollectionsSummary(List<MethodTotal> byMethod, BigDecimal walkInSalesTotal) {
    }

    public record MethodTotal(PaymentMethod method, BigDecimal total) {
    }

    public record DebtSummary(BigDecimal totalDebt, long debtorCount) {
    }

    public record TopProduct(Long productVariantId, String productName, String sku, long quantity, BigDecimal total) {
    }

    public record PendingOrders(long count, Instant oldestCreatedAt) {
    }

    public record LowStock(int threshold, long count, List<LowStockItem> items) {
    }

    public record LowStockItem(
            Long stockId,
            Long productVariantId,
            String productName,
            String sku,
            Long branchId,
            String branchName,
            int quantity
    ) {
    }
}
