package com.gonzalez.erp.modules.reports.service;

import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse;

import java.time.Instant;

public interface ReportService {

    /**
     * Dashboard de [from, to) comparado con [previousFrom, previousFrom + (to - from)). Sin
     * previousFrom, el período anterior es el inmediatamente anterior de la misma duración.
     * Sin branchId suma todas las sucursales asignadas al usuario.
     */
    DashboardResponse getDashboard(Instant from, Instant to, Instant previousFrom, Long branchId,
                                   int lowStockThreshold);
}
