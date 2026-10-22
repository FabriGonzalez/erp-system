package com.gonzalez.erp.config;

import com.gonzalez.erp.modules.branches.exception.BranchNameAlreadyExistsException;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.products.exception.PricePermissionRequiredException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Errores que antes caían en el catch-all como 500, y el catch-all sin detalle interno. */
class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void parameterWithInvalidTypeIsABadRequest() throws Exception {
        mockMvc.perform(get("/test/items").param("type", "FOO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void nonNumericPathVariableIsABadRequest() throws Exception {
        mockMvc.perform(get("/test/items/stock"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void missingRequiredParameterIsABadRequest() throws Exception {
        mockMvc.perform(get("/test/required"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void unsupportedMethodIsMethodNotAllowed() throws Exception {
        mockMvc.perform(put("/test/items/1"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void unsupportedContentTypeIsReported() throws Exception {
        mockMvc.perform(post("/test/items").contentType("text/plain").content("hola"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void businessConflictCarriesItsCode() throws Exception {
        mockMvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BRANCH_NAME_ALREADY_EXISTS"));
    }

    @Test
    void missingPricePermissionHasItsOwnCode() throws Exception {
        mockMvc.perform(get("/test/price"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PRICE_PERMISSION_REQUIRED"));
    }

    @Test
    void unexpectedErrorDoesNotExposeItsMessage() throws Exception {
        mockMvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("Internal server error"))
                .andExpect(content().string(not(containsString("detalle interno"))));
    }

    @RestController
    @RequestMapping("/test")
    static class TestController {

        @GetMapping("/items")
        String search(@RequestParam(required = false) StockMovementType type) {
            return "ok";
        }

        @GetMapping("/items/{id}")
        String findById(@PathVariable Long id) {
            return "ok";
        }

        @PostMapping("/items")
        String create(@RequestBody Map<String, Object> body) {
            return "ok";
        }

        @GetMapping("/required")
        String required(@RequestParam Long branchId) {
            return "ok";
        }

        @GetMapping("/conflict")
        String conflict() {
            throw new BranchNameAlreadyExistsException("Centro");
        }

        @GetMapping("/price")
        String price() {
            throw new PricePermissionRequiredException();
        }

        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("detalle interno de la base");
        }
    }
}
