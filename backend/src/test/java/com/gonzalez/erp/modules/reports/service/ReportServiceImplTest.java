package com.gonzalez.erp.modules.reports.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchAccessDeniedException;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.dto.response.CustomerDebtSummaryResponse;
import com.gonzalez.erp.modules.customers.service.CustomerBalanceService;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.payments.repository.PaymentRepository;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.MethodTotal;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse.TopProduct;
import com.gonzalez.erp.modules.reports.exception.InvalidReportRangeException;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final Long CENTRO_ID = 10L;
    private static final Long NORTE_ID = 11L;
    private static final Instant FROM = Instant.parse("2026-10-19T03:00:00Z");
    private static final Instant TO = Instant.parse("2026-10-20T03:00:00Z");
    private static final Instant PREVIOUS_FROM = Instant.parse("2026-10-18T03:00:00Z");

    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private StockRepository stockRepository;
    @Mock private BranchAccessService branchAccessService;
    @Mock private CustomerBalanceService customerBalanceService;

    @InjectMocks private ReportServiceImpl reportService;

    private Company company;
    private User user;
    private Branch centro;
    private Branch norte;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        user = User.builder()
                .username("gerente")
                .email("gerente@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(USER_ID);
        centro = branch(CENTRO_ID, "Centro");
        norte = branch(NORTE_ID, "Norte");

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void fromMustBeBeforeTo() {
        assertThatThrownBy(() -> reportService.getDashboard(TO, FROM, null, null, 5))
                .isInstanceOf(InvalidReportRangeException.class);
        assertThatThrownBy(() -> reportService.getDashboard(FROM, FROM, null, null, 5))
                .isInstanceOf(InvalidReportRangeException.class);
    }

    @Test
    void rangeCannotBeLongerThan366Days() {
        Instant to = FROM.plus(Duration.ofDays(367));

        assertThatThrownBy(() -> reportService.getDashboard(FROM, to, null, null, 5))
                .isInstanceOf(InvalidReportRangeException.class);
    }

    @Test
    void thresholdMustBeInRange() {
        assertThatThrownBy(() -> reportService.getDashboard(FROM, TO, null, null, -1))
                .isInstanceOf(InvalidReportRangeException.class);
        assertThatThrownBy(() -> reportService.getDashboard(FROM, TO, null, null, 1001))
                .isInstanceOf(InvalidReportRangeException.class);
    }

    @Test
    void branchNotAssignedToTheUserIsForbidden() {
        when(branchAccessService.requireAccessible(NORTE_ID)).thenThrow(new BranchAccessDeniedException(NORTE_ID));

        assertThatThrownBy(() -> reportService.getDashboard(FROM, TO, null, NORTE_ID, 5))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(orderRepository);
    }

    @Test
    void branchOfAnotherCompanyIsNotFound() {
        when(branchAccessService.requireAccessible(99L)).thenThrow(new ResourceNotFoundException("Branch not found"));

        assertThatThrownBy(() -> reportService.getDashboard(FROM, TO, null, 99L, 5))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void userWithoutBranchesGetsZerosWithoutQuerying() {
        when(branchAccessService.accessibleBranchIds()).thenReturn(List.of());
        when(customerBalanceService.getDebtSummary(COMPANY_ID))
                .thenReturn(new CustomerDebtSummaryResponse(new BigDecimal("1500"), 2));

        DashboardResponse response = reportService.getDashboard(FROM, TO, null, null, 5);

        assertThat(response.sales().orderCount()).isZero();
        assertThat(response.sales().averageTicket()).isEqualByComparingTo("0");
        assertThat(response.collections().byMethod()).hasSize(PaymentMethod.values().length);
        assertThat(response.debt().totalDebt()).isEqualByComparingTo("1500");
        assertThat(response.lowStock().threshold()).isEqualTo(5);
        verifyNoInteractions(orderRepository, paymentRepository, stockRepository);
    }

    @Test
    void allBranchesAreSummedAndComparedWithThePreviousPeriodOfTheSameLength() {
        List<Long> branchIds = List.of(CENTRO_ID, NORTE_ID);
        when(branchAccessService.accessibleBranchIds()).thenReturn(branchIds);
        when(customerBalanceService.getDebtSummary(COMPANY_ID))
                .thenReturn(new CustomerDebtSummaryResponse(BigDecimal.ZERO, 0));
        when(orderRepository.sumSalesByBranch(COMPANY_ID, branchIds, FROM, TO)).thenReturn(List.of(
                new Object[]{CENTRO_ID, "Centro", 2L, new BigDecimal("3000")},
                new Object[]{NORTE_ID, "Norte", 1L, new BigDecimal("1000")}));
        when(orderRepository.sumSalesByBranch(COMPANY_ID, branchIds, PREVIOUS_FROM, FROM))
                .thenReturn(List.of());
        when(paymentRepository.sumActiveByMethod(COMPANY_ID, branchIds, FROM, TO)).thenReturn(
                List.<Object[]>of(new Object[]{PaymentMethod.CASH, new BigDecimal("700")}));
        // Ventas sin cliente: 300 en efectivo (suman al medio) y 1000 de antes de guardar el medio.
        when(orderRepository.sumWalkInSalesByMethod(COMPANY_ID, branchIds, FROM, TO)).thenReturn(List.of(
                new Object[]{PaymentMethod.CASH, new BigDecimal("300")},
                new Object[]{null, new BigDecimal("1000")}));
        when(orderRepository.findTopSellingVariants(eq(COMPANY_ID), eq(branchIds), eq(FROM), eq(TO), any()))
                .thenReturn(List.<Object[]>of(new Object[]{5L, "Remera", "REM-M", 4L, new BigDecimal("2000")}));
        when(orderRepository.summarizeOrdersToPrepare(COMPANY_ID, branchIds))
                .thenReturn(List.<Object[]>of(new Object[]{0L, null}));
        when(stockRepository.findLowStock(eq(COMPANY_ID), eq(branchIds), anyInt(), any()))
                .thenReturn(Page.empty());

        DashboardResponse response = reportService.getDashboard(FROM, TO, null, null, 5);

        assertThat(response.previousFrom()).isEqualTo(PREVIOUS_FROM);
        assertThat(response.previousTo()).isEqualTo(FROM);
        assertThat(response.sales().orderCount()).isEqualTo(3);
        assertThat(response.sales().total()).isEqualByComparingTo("4000");
        assertThat(response.sales().averageTicket()).isEqualByComparingTo("1333.33");
        assertThat(response.previousSales().orderCount()).isZero();
        assertThat(response.previousSales().averageTicket()).isEqualByComparingTo("0");
        assertThat(response.salesByBranch()).hasSize(2);
        assertThat(response.collections().byMethod())
                .extracting(MethodTotal::method)
                .containsExactly(PaymentMethod.values());
        assertThat(response.collections().byMethod().get(0).total()).isEqualByComparingTo("1000");
        assertThat(response.collections().withoutMethodTotal()).isEqualByComparingTo("1000");
        assertThat(response.topProducts()).singleElement()
                .satisfies(top -> assertThat(top.quantity()).isEqualTo(4));
        assertThat(response.pendingOrders().count()).isZero();
        assertThat(response.pendingOrders().oldestCreatedAt()).isNull();
    }

    @Test
    void oneBranchOnlyQueriesThatBranch() {
        when(branchAccessService.requireAccessible(NORTE_ID)).thenReturn(norte);
        when(customerBalanceService.getDebtSummary(COMPANY_ID))
                .thenReturn(new CustomerDebtSummaryResponse(BigDecimal.ZERO, 0));
        when(orderRepository.summarizeOrdersToPrepare(COMPANY_ID, List.of(NORTE_ID)))
                .thenReturn(List.<Object[]>of(new Object[]{0L, null}));
        when(stockRepository.findLowStock(eq(COMPANY_ID), eq(List.of(NORTE_ID)), anyInt(), any()))
                .thenReturn(Page.empty());

        DashboardResponse response = reportService.getDashboard(FROM, TO, null, NORTE_ID, 5);

        assertThat(response.branchId()).isEqualTo(NORTE_ID);
        verify(orderRepository).sumSalesByBranch(COMPANY_ID, List.of(NORTE_ID), FROM, TO);
        verify(orderRepository, never()).sumSalesByBranch(COMPANY_ID, List.of(CENTRO_ID, NORTE_ID), FROM, TO);
    }

    @Test
    void previousFromComparesTheSameLengthShiftedBack() {
        // Hoy hasta las 15 h contra ayer hasta las 15 h, no contra las 15 horas antes de la medianoche.
        Instant to = Instant.parse("2026-10-19T18:00:00Z");
        Instant previousTo = Instant.parse("2026-10-18T18:00:00Z");
        when(branchAccessService.accessibleBranchIds()).thenReturn(List.of(CENTRO_ID));
        when(customerBalanceService.getDebtSummary(COMPANY_ID))
                .thenReturn(new CustomerDebtSummaryResponse(BigDecimal.ZERO, 0));
        when(orderRepository.summarizeOrdersToPrepare(COMPANY_ID, List.of(CENTRO_ID)))
                .thenReturn(List.<Object[]>of(new Object[]{0L, null}));
        when(stockRepository.findLowStock(eq(COMPANY_ID), eq(List.of(CENTRO_ID)), anyInt(), any()))
                .thenReturn(Page.empty());

        DashboardResponse response = reportService.getDashboard(FROM, to, PREVIOUS_FROM, null, 5);

        assertThat(response.previousFrom()).isEqualTo(PREVIOUS_FROM);
        assertThat(response.previousTo()).isEqualTo(previousTo);
        verify(orderRepository).sumSalesByBranch(COMPANY_ID, List.of(CENTRO_ID), PREVIOUS_FROM, previousTo);
    }

    @Test
    void previousPeriodCannotOverlapTheCurrentOne() {
        Instant overlapping = FROM.minus(Duration.ofHours(12));

        assertThatThrownBy(() -> reportService.getDashboard(FROM, TO, overlapping, null, 5))
                .isInstanceOf(InvalidReportRangeException.class);
    }

    private Branch branch(Long id, String name) {
        Branch branch = Branch.builder().name(name).company(company).build();
        branch.setId(id);
        return branch;
    }

    @Test
    void topProductsAddTheUnitsSoldInsidePromos() {
        List<Long> branchIds = List.of(CENTRO_ID);
        when(branchAccessService.accessibleBranchIds()).thenReturn(branchIds);
        when(customerBalanceService.getDebtSummary(COMPANY_ID))
                .thenReturn(new CustomerDebtSummaryResponse(BigDecimal.ZERO, 0));
        when(orderRepository.findTopSellingVariants(eq(COMPANY_ID), eq(branchIds), eq(FROM), eq(TO), any()))
                .thenReturn(List.<Object[]>of(
                        new Object[]{5L, "Remera", "REM-M", 4L, new BigDecimal("4000")},
                        new Object[]{6L, "Buzo", "BUZ-M", 3L, new BigDecimal("9000")}));
        when(orderRepository.sumPromoUnitsByVariant(COMPANY_ID, branchIds, FROM, TO)).thenReturn(List.<Object[]>of(
                new Object[]{6L, "Buzo", "BUZ-M", 2L},
                new Object[]{7L, "Gorra", "GOR-U", 1L}));
        when(orderRepository.summarizeOrdersToPrepare(COMPANY_ID, branchIds))
                .thenReturn(List.<Object[]>of(new Object[]{0L, null}));
        when(stockRepository.findLowStock(eq(COMPANY_ID), eq(branchIds), anyInt(), any()))
                .thenReturn(Page.empty());

        DashboardResponse response = reportService.getDashboard(FROM, TO, null, null, 5);

        // Buzo: 3 sueltos + 2 en promos; el importe es solo el de los sueltos.
        assertThat(response.topProducts())
                .extracting(TopProduct::sku, TopProduct::quantity)
                .containsExactly(
                        tuple("BUZ-M", 5L),
                        tuple("REM-M", 4L),
                        tuple("GOR-U", 1L));
        assertThat(response.topProducts().get(0).total()).isEqualByComparingTo("9000");
        assertThat(response.topProducts().get(2).total()).isEqualByComparingTo("0");
    }
}
