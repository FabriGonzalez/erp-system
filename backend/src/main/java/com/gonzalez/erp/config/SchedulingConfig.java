package com.gonzalez.erp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Habilita @Scheduled (renovación de tokens de Mercado Pago). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
