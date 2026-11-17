package com.gonzalez.erp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Habilita @Async (los mails de la tienda). Usa el pool de tareas que configura Spring Boot. */
@Configuration
@EnableAsync
public class AsyncConfig {
}
