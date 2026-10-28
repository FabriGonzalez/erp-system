package com.gonzalez.erp.modules.reports.service;

import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.customers.dto.response.CustomerDebtSummaryResponse;
import com.gonzalez.erp.modules.customers.service.CustomerBalanceService;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.payments.repository.PaymentRepository;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.BranchSales;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.CollectionsSummary;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.DebtSummary;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.LowStock;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.LowStockItem;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.MethodTotal;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.PendingOrders;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.SalesSummary;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.TopProduct;
import com.gonzalez.erp.modules.reports.exception.InvalidReportRangeException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    static final Duration MAX_RANGE = Duration.ofDays(366);
    static final int MAX_LOW_STOCK_THRESHOLD = 1000;
    static final int TOP_PRODUCTS_LIMIT = 10;
    static final int LOW_STOCK_ITEMS_LIMIT = 20;

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final StockRepository stockRepository;
    private final BranchAccessService branchAccessService;
    private final CustomerBalanceService customerBalanceService;

    @Override
    public DashboardResponse getDashboard(Instant from, Instant to, Instant requestedPreviousFrom, Long branchId,
                                          int lowStockThreshold) {
        validate(from, to, lowStockThreshold);
        Duration length = Duration.between(from, to);
        Instant previousFrom = requestedPreviousFrom != null ? requestedPreviousFrom : from.minus(length);
        Instant previousTo = previousFrom.plus(length);
        if (previousTo.isAfter(from)) {
            throw new InvalidReportRangeException("The previous period cannot overlap the current one");
        }
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        // Mismo alcance que el listado de pedidos: las sucursales accesibles del usuario.
        List<Long> branchIds = branchId == null
                ? branchAccessService.accessibleBranchIds()
                : List.of(branchAccessService.requireAccessible(branchId).getId());

        // La deuda es del cliente, no de la sucursal: se informa igual aunque no haya sucursales.
        CustomerDebtSummaryResponse debt = customerBalanceService.getDebtSummary(companyId);
        DebtSummary debtSummary = new DebtSummary(debt.totalDebt(), debt.debtorCount());

        if (branchIds.isEmpty()) {
            return new DashboardResponse(from, to, previousFrom, previousTo, branchId,
                    emptySales(), emptySales(), List.of(),
                    collections(List.of(), List.of()),
                    debtSummary, List.of(), new PendingOrders(0, null),
                    new LowStock(lowStockThreshold, 0, List.of()));
        }

        List<BranchSales> salesByBranch = orderRepository.sumSalesByBranch(companyId, branchIds, from, to)
                .stream()
                .map(row -> new BranchSales(
                        (Long) row[0], (String) row[1], toLong(row[2]), (BigDecimal) row[3]))
                .toList();
        SalesSummary sales = summarize(salesByBranch);
        SalesSummary previousSales = summarize(orderRepository
                .sumSalesByBranch(companyId, branchIds, previousFrom, previousTo)
                .stream()
                .map(row -> new BranchSales(
                        (Long) row[0], (String) row[1], toLong(row[2]), (BigDecimal) row[3]))
                .toList());

        CollectionsSummary collections = collections(
                paymentRepository.sumActiveByMethod(companyId, branchIds, from, to),
                orderRepository.sumWalkInSalesByMethod(companyId, branchIds, from, to));

        List<TopProduct> topProducts = topProducts(companyId, branchIds, from, to);

        Object[] pendingRow = orderRepository.summarizeOrdersToPrepare(companyId, branchIds).get(0);
        PendingOrders pendingOrders = new PendingOrders(toLong(pendingRow[0]), (Instant) pendingRow[1]);

        Page<Stock> lowStockPage = stockRepository.findLowStock(
                companyId, branchIds, lowStockThreshold, PageRequest.of(0, LOW_STOCK_ITEMS_LIMIT));
        LowStock lowStock = new LowStock(
                lowStockThreshold,
                lowStockPage.getTotalElements(),
                lowStockPage.getContent().stream().map(ReportServiceImpl::toLowStockItem).toList());

        return new DashboardResponse(from, to, previousFrom, previousTo, branchId,
                sales, previousSales, salesByBranch, collections, debtSummary,
                topProducts, pendingOrders, lowStock);
    }

    /**
     * Más vendidos por unidades, sueltas y dentro de promos. El total es solo de las sueltas:
     * el precio de una promo no se reparte entre sus variantes. Para sumar las dos fuentes se
     * traen todas las variantes vendidas en el período (agrupadas) y se corta después.
     */
    private List<TopProduct> topProducts(Long companyId, List<Long> branchIds, Instant from, Instant to) {
        Map<Long, TopProduct> byVariant = new LinkedHashMap<>();
        for (Object[] row : orderRepository.findTopSellingVariants(companyId, branchIds, from, to, Pageable.unpaged())) {
            byVariant.put((Long) row[0], new TopProduct(
                    (Long) row[0], (String) row[1], (String) row[2], toLong(row[3]), (BigDecimal) row[4]));
        }
        for (Object[] row : orderRepository.sumPromoUnitsByVariant(companyId, branchIds, from, to)) {
            Long variantId = (Long) row[0];
            TopProduct loose = byVariant.get(variantId);
            byVariant.put(variantId, new TopProduct(
                    variantId, (String) row[1], (String) row[2],
                    toLong(row[3]) + (loose != null ? loose.quantity() : 0),
                    loose != null ? loose.total() : BigDecimal.ZERO));
        }
        return byVariant.values().stream()
                .sorted(Comparator.comparingLong(TopProduct::quantity).reversed()
                        .thenComparing(TopProduct::productVariantId))
                .limit(TOP_PRODUCTS_LIMIT)
                .toList();
    }

    private static void validate(Instant from, Instant to, int lowStockThreshold) {
        if (!from.isBefore(to)) {
            throw new InvalidReportRangeException("from must be before to");
        }
        if (Duration.between(from, to).compareTo(MAX_RANGE) > 0) {
            throw new InvalidReportRangeException("The range cannot be longer than " + MAX_RANGE.toDays() + " days");
        }
        if (lowStockThreshold < 0 || lowStockThreshold > MAX_LOW_STOCK_THRESHOLD) {
            throw new InvalidReportRangeException(
                    "lowStockThreshold must be between 0 and " + MAX_LOW_STOCK_THRESHOLD);
        }
    }

    private static SalesSummary summarize(List<BranchSales> byBranch) {
        long count = 0;
        BigDecimal total = BigDecimal.ZERO;
        for (BranchSales branch : byBranch) {
            count += branch.orderCount();
            total = total.add(branch.total());
        }
        BigDecimal averageTicket = count == 0
                ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        return new SalesSummary(count, total, averageTicket);
    }

    private static SalesSummary emptySales() {
        return new SalesSummary(0, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    /**
     * Todos los medios en el orden del enum (en cero si no hubo): pagos más ventas sin cliente.
     * Las ventas sin cliente sin medio (anteriores a guardarlo) van aparte.
     */
    private static CollectionsSummary collections(List<Object[]> paymentRows, List<Object[]> walkInRows) {
        Map<PaymentMethod, BigDecimal> totals = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod method : PaymentMethod.values()) {
            totals.put(method, BigDecimal.ZERO);
        }
        BigDecimal withoutMethod = BigDecimal.ZERO;
        for (Object[] row : paymentRows) {
            totals.merge((PaymentMethod) row[0], (BigDecimal) row[1], BigDecimal::add);
        }
        for (Object[] row : walkInRows) {
            if (row[0] == null) {
                withoutMethod = withoutMethod.add((BigDecimal) row[1]);
            } else {
                totals.merge((PaymentMethod) row[0], (BigDecimal) row[1], BigDecimal::add);
            }
        }
        List<MethodTotal> byMethod = new ArrayList<>();
        totals.forEach((method, total) -> byMethod.add(new MethodTotal(method, total)));
        return new CollectionsSummary(byMethod, withoutMethod);
    }

    private static LowStockItem toLowStockItem(Stock stock) {
        return new LowStockItem(
                stock.getId(),
                stock.getProductVariant().getId(),
                stock.getProductVariant().getProduct().getName(),
                stock.getProductVariant().getSku(),
                stock.getBranch().getId(),
                stock.getBranch().getName(),
                stock.getQuantity());
    }

    private static long toLong(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }
}
