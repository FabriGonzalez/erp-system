package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockMovementRecorderTest {

    private static final Long USER_ID = 7L;

    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private StockMovementRecorder recorder;

    private User user;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(1L);
        user = User.builder()
                .username("deposito")
                .email("deposito@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(USER_ID);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordsTheMovementWithTheCurrentUserAndTheStockQuantityAsNewQuantity() {
        Stock stock = Stock.builder().quantity(3).build();
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(inv -> inv.getArgument(0));

        recorder.record(stock, StockMovementType.SALE, -2, 5, null, "ORDER", 100L);

        ArgumentCaptor<StockMovement> saved = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(saved.capture());
        StockMovement movement = saved.getValue();
        assertThat(movement.getStock()).isSameAs(stock);
        assertThat(movement.getType()).isEqualTo(StockMovementType.SALE);
        assertThat(movement.getQuantity()).isEqualTo(-2);
        assertThat(movement.getPreviousQuantity()).isEqualTo(5);
        assertThat(movement.getNewQuantity()).isEqualTo(3);
        assertThat(movement.getReferenceType()).isEqualTo("ORDER");
        assertThat(movement.getReferenceId()).isEqualTo(100L);
        assertThat(movement.getCreatedBy()).isSameAs(user);
    }
}
