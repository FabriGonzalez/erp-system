package com.gonzalez.erp.modules.payments.repository;

import com.gonzalez.erp.modules.payments.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByIdAndCompanyId(Long id, Long companyId);

    List<Payment> findByCompanyId(Long companyId);

    List<Payment> findByCustomerIdAndCompanyId(Long customerId, Long companyId);
}