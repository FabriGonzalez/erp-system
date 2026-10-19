package com.gonzalez.erp.config;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.auth.exception.InvalidPasswordChangeException;
import com.gonzalez.erp.modules.auth.exception.TooManyLoginAttemptsException;
import com.gonzalez.erp.modules.companies.exception.CompanyNameAlreadyExistsException;
import com.gonzalez.erp.modules.companies.exception.CompanyNotActiveException;
import com.gonzalez.erp.modules.companies.exception.CompanyTaxIdAlreadyExistsException;
import com.gonzalez.erp.modules.companies.exception.InvalidCompanyStatusTransitionException;
import com.gonzalez.erp.modules.branches.exception.BranchNameAlreadyExistsException;
import com.gonzalez.erp.modules.categories.exception.CategoryNameAlreadyExistsException;
import com.gonzalez.erp.modules.customers.exception.CustomerDocumentAlreadyExistsException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerAddressException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerDocumentException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerRequestException;
import com.gonzalez.erp.modules.inventory.exception.InsufficientStockException;
import com.gonzalez.erp.modules.inventory.exception.StockAlreadyExistsException;
import com.gonzalez.erp.modules.inventory.exception.InvalidStockMovementQueryException;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.orders.exception.InactiveOrderCustomerException;
import com.gonzalez.erp.modules.orders.exception.InsufficientStockForEditException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderStatusTransitionException;
import com.gonzalez.erp.modules.orders.exception.InvalidShippingAddressException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.payments.exception.InvalidPaymentException;
import com.gonzalez.erp.modules.products.exception.InvalidProductVariantsException;
import com.gonzalez.erp.modules.products.exception.ProductAttributeNameAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductAttributeValueAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductCategoryNotActiveException;
import com.gonzalez.erp.modules.products.exception.ProductSkuAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductVariantSkuAlreadyExistsException;
import com.gonzalez.erp.modules.reports.exception.InvalidReportRangeException;
import com.gonzalez.erp.modules.roles.exception.RoleCodeAlreadyExistsException;
import com.gonzalez.erp.modules.roles.exception.RoleNameAlreadyExistsException;
import com.gonzalez.erp.modules.shipments.exception.InvalidShipmentException;
import com.gonzalez.erp.modules.shipments.exception.OrderAlreadyHasShipmentException;
import com.gonzalez.erp.modules.transfers.exception.InvalidStockTransferException;
import com.gonzalez.erp.modules.users.exception.UserEmailAlreadyExistsException;
import com.gonzalez.erp.modules.users.exception.UserUsernameAlreadyExistsException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(
                        HttpStatus.FORBIDDEN.value(),
                        HttpStatus.FORBIDDEN.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "FORBIDDEN"
                ));
    }

    // Sin este handler el catch-all de Exception devolvía 500 ante credenciales inválidas.
    // El mensaje es siempre el mismo para no revelar si el usuario existe o está deshabilitado.
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(
            AuthenticationException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(
                        HttpStatus.UNAUTHORIZED.value(),
                        HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                        "Invalid credentials",
                        request.getRequestURI(),
                        "INVALID_CREDENTIALS"
                ));
    }

    @ExceptionHandler(TooManyLoginAttemptsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyLoginAttempts(
            TooManyLoginAttemptsException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(ErrorResponse.of(
                        HttpStatus.TOO_MANY_REQUESTS.value(),
                        HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "TOO_MANY_LOGIN_ATTEMPTS"
                ));
    }

    @ExceptionHandler(CompanyNotActiveException.class)
    public ResponseEntity<ErrorResponse> handleCompanyNotActive(
            CompanyNotActiveException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(
                        HttpStatus.FORBIDDEN.value(),
                        HttpStatus.FORBIDDEN.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        ex.getCode()
                ));
    }

    @ExceptionHandler(InvalidPasswordChangeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPasswordChange(
            InvalidPasswordChangeException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        ex.getCode()
                ));
    }

    @ExceptionHandler(InvalidCompanyStatusTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCompanyStatusTransition(
            InvalidCompanyStatusTransitionException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "INVALID_COMPANY_STATUS_TRANSITION"
                ));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(
                        HttpStatus.NOT_FOUND.value(),
                        HttpStatus.NOT_FOUND.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "NOT_FOUND"
                ));
    }

    /** Duplicados y categoría inactiva, con code para que el frontend diga qué pasó. */
    @ExceptionHandler({
            CompanyNameAlreadyExistsException.class,
            CompanyTaxIdAlreadyExistsException.class,
            BranchNameAlreadyExistsException.class,
            CategoryNameAlreadyExistsException.class,
            ProductSkuAlreadyExistsException.class,
            ProductVariantSkuAlreadyExistsException.class,
            ProductAttributeNameAlreadyExistsException.class,
            ProductAttributeValueAlreadyExistsException.class,
            ProductCategoryNotActiveException.class,
            CustomerDocumentAlreadyExistsException.class
    })
    public ResponseEntity<ErrorResponse> handleConflict(
            RuntimeException ex, HttpServletRequest request) {
        String code = switch (ex) {
            case CompanyNameAlreadyExistsException e -> "COMPANY_NAME_ALREADY_EXISTS";
            case CompanyTaxIdAlreadyExistsException e -> "COMPANY_TAX_ID_ALREADY_EXISTS";
            case BranchNameAlreadyExistsException e -> "BRANCH_NAME_ALREADY_EXISTS";
            case CategoryNameAlreadyExistsException e -> "CATEGORY_NAME_ALREADY_EXISTS";
            case ProductSkuAlreadyExistsException e -> "PRODUCT_SKU_ALREADY_EXISTS";
            case ProductVariantSkuAlreadyExistsException e -> "VARIANT_SKU_ALREADY_EXISTS";
            case ProductAttributeNameAlreadyExistsException e -> "ATTRIBUTE_NAME_ALREADY_EXISTS";
            case ProductAttributeValueAlreadyExistsException e -> "ATTRIBUTE_VALUE_ALREADY_EXISTS";
            case ProductCategoryNotActiveException e -> "CATEGORY_INACTIVE";
            default -> "CUSTOMER_DOCUMENT_ALREADY_EXISTS";
        };
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        code
                ));
    }

    /** Duplicados de usuarios y roles, con code para que el frontend diga qué campo se repite. */
    @ExceptionHandler({
            UserUsernameAlreadyExistsException.class,
            UserEmailAlreadyExistsException.class,
            RoleNameAlreadyExistsException.class,
            RoleCodeAlreadyExistsException.class
    })
    public ResponseEntity<ErrorResponse> handleUserOrRoleConflict(
            RuntimeException ex, HttpServletRequest request) {
        String code = switch (ex) {
            case UserUsernameAlreadyExistsException e -> "USERNAME_ALREADY_EXISTS";
            case UserEmailAlreadyExistsException e -> "EMAIL_ALREADY_EXISTS";
            case RoleNameAlreadyExistsException e -> "ROLE_NAME_ALREADY_EXISTS";
            default -> "ROLE_CODE_ALREADY_EXISTS";
        };
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        code
                ));
    }

    @ExceptionHandler(OrderAlreadyHasShipmentException.class)
    public ResponseEntity<ErrorResponse> handleOrderAlreadyHasShipment(
            OrderAlreadyHasShipmentException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "ORDER_ALREADY_HAS_SHIPMENT"
                ));
    }

    @ExceptionHandler({
            InvalidCustomerAddressException.class,
            InvalidCustomerRequestException.class
    })
    public ResponseEntity<ErrorResponse> handleInvalidCustomerRequest(
            RuntimeException ex, HttpServletRequest request) {
        String code = ex instanceof InvalidCustomerAddressException
                ? "INVALID_CUSTOMER_ADDRESS"
                : "INVALID_CUSTOMER_QUERY";
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        code
                ));
    }

    @ExceptionHandler(InvalidCustomerDocumentException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCustomerDocument(
            InvalidCustomerDocumentException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "INVALID_CUSTOMER_DOCUMENT"
                ));
    }

    @ExceptionHandler(InvalidProductVariantsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidProductVariants(
            InvalidProductVariantsException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "INVALID_PRODUCT_VARIANTS"
                ));
    }

    @ExceptionHandler(StockNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleStockNotFound(
            StockNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(
                        HttpStatus.NOT_FOUND.value(),
                        HttpStatus.NOT_FOUND.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "STOCK_NOT_FOUND"
                ));
    }

    @ExceptionHandler(StockAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleStockAlreadyExists(
            StockAlreadyExistsException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "STOCK_ALREADY_EXISTS"
                ));
    }

    @ExceptionHandler(InvalidStockTransferException.class)
    public ResponseEntity<ErrorResponse> handleInvalidStockTransfer(
            InvalidStockTransferException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "INVALID_STOCK_TRANSFER"
                ));
    }

    @ExceptionHandler(InvalidReportRangeException.class)
    public ResponseEntity<ErrorResponse> handleInvalidReportRange(
            InvalidReportRangeException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "INVALID_REPORT_RANGE"
                ));
    }

    @ExceptionHandler(InvalidStockMovementQueryException.class)
    public ResponseEntity<ErrorResponse> handleInvalidStockMovementQuery(
            InvalidStockMovementQueryException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        "INVALID_STOCK_MOVEMENT_QUERY"
                ));
    }

    @ExceptionHandler({
            InvalidOrderStatusTransitionException.class,
            InsufficientStockForEditException.class,
            InsufficientStockException.class
    })
    public ResponseEntity<ErrorResponse> handleOrderConflict(
            RuntimeException ex, HttpServletRequest request) {
        String code = ex instanceof InvalidOrderStatusTransitionException
                ? "INVALID_STATUS_TRANSITION"
                : "INSUFFICIENT_STOCK";
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        code
                ));
    }

    @ExceptionHandler({
            InvalidOrderException.class,
            QuickSaleValidationException.class,
            InvalidPaymentException.class,
            InactiveOrderCustomerException.class,
            InvalidShippingAddressException.class,
            InvalidShipmentException.class
    })
    public ResponseEntity<ErrorResponse> handleInvalidOrder(
            RuntimeException ex, HttpServletRequest request) {
        String code = ex instanceof QuickSaleValidationException ? "QUICK_SALE_INVALID"
                : ex instanceof InactiveOrderCustomerException ? "CUSTOMER_INACTIVE"
                : ex instanceof InvalidShippingAddressException ? "INVALID_SHIPPING_ADDRESS"
                : ex instanceof InvalidShipmentException ? "INVALID_SHIPMENT"
                : ex instanceof InvalidPaymentException ? "INVALID_PAYMENT"
                : "INVALID_ORDER";
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI(),
                        code
                ));
    }

    // JSON mal formado o con tipos incompatibles: antes caía en el catch-all como 500.
    // No se devuelve el detalle de Jackson para no exponer tipos internos.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        "Malformed request body",
                        request.getRequestURI(),
                        "MALFORMED_REQUEST"
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        String.join("; ", errors),
                        request.getRequestURI(),
                        "VALIDATION_ERROR"
                ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        "Resource already exists or violates a data constraint",
                        request.getRequestURI(),
                        "DATA_INTEGRITY_VIOLATION"
                ));
    }

    // Errores de Spring MVC: antes caían en el catch-all como 500. Como con el JSON mal formado,
    // no se devuelve el detalle del framework.

    /** ?type=FOO o un id no numérico en la ruta (p. ej. /movements/stock/1 contra /{id}). */
    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<ErrorResponse> handleInvalidParameter(
            Exception ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        "Invalid or missing request parameter",
                        request.getRequestURI(),
                        "INVALID_PARAMETER"
                ));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ErrorResponse.of(
                        HttpStatus.METHOD_NOT_ALLOWED.value(),
                        HttpStatus.METHOD_NOT_ALLOWED.getReasonPhrase(),
                        "HTTP method not supported for this endpoint",
                        request.getRequestURI(),
                        "METHOD_NOT_ALLOWED"
                ));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(ErrorResponse.of(
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE.value(),
                        HttpStatus.UNSUPPORTED_MEDIA_TYPE.getReasonPhrase(),
                        "Unsupported content type",
                        request.getRequestURI(),
                        "UNSUPPORTED_MEDIA_TYPE"
                ));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(
            NoResourceFoundException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(
                        HttpStatus.NOT_FOUND.value(),
                        HttpStatus.NOT_FOUND.getReasonPhrase(),
                        "Endpoint not found",
                        request.getRequestURI(),
                        "NOT_FOUND"
                ));
    }

    /** Lo inesperado se loguea completo y no se le muestra el detalle interno al cliente. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                        "Internal server error",
                        request.getRequestURI(),
                        "INTERNAL_ERROR"
                ));
    }
}

