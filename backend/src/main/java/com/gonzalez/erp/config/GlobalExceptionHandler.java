package com.gonzalez.erp.config;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.companies.exception.CompanyNameAlreadyExistsException;
import com.gonzalez.erp.modules.branches.exception.BranchNameAlreadyExistsException;
import com.gonzalez.erp.modules.categories.exception.CategoryNameAlreadyExistsException;
import com.gonzalez.erp.modules.customers.exception.CustomerDocumentAlreadyExistsException;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerDocumentException;
import com.gonzalez.erp.modules.inventory.exception.InsufficientStockException;
import com.gonzalez.erp.modules.inventory.exception.StockAlreadyExistsException;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.orders.exception.InsufficientStockForEditException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderStatusTransitionException;
import com.gonzalez.erp.modules.orders.exception.QuickSaleValidationException;
import com.gonzalez.erp.modules.products.exception.ProductAttributeNameAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductAttributeValueAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductCategoryNotActiveException;
import com.gonzalez.erp.modules.products.exception.ProductSkuAlreadyExistsException;
import com.gonzalez.erp.modules.products.exception.ProductVariantSkuAlreadyExistsException;
import com.gonzalez.erp.modules.roles.exception.RoleCodeAlreadyExistsException;
import com.gonzalez.erp.modules.roles.exception.RoleNameAlreadyExistsException;
import com.gonzalez.erp.modules.shipments.exception.OrderAlreadyHasShipmentException;
import com.gonzalez.erp.modules.transfers.exception.InvalidStockTransferException;
import com.gonzalez.erp.modules.users.exception.UserEmailAlreadyExistsException;
import com.gonzalez.erp.modules.users.exception.UserUsernameAlreadyExistsException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(
                        HttpStatus.NOT_FOUND.value(),
                        HttpStatus.NOT_FOUND.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI()
                ));
    }

    @ExceptionHandler({
            CompanyNameAlreadyExistsException.class,
            BranchNameAlreadyExistsException.class,
            CategoryNameAlreadyExistsException.class,
            RoleNameAlreadyExistsException.class,
            RoleCodeAlreadyExistsException.class,
            UserEmailAlreadyExistsException.class,
            UserUsernameAlreadyExistsException.class,
            ProductSkuAlreadyExistsException.class,
            ProductVariantSkuAlreadyExistsException.class,
            ProductAttributeNameAlreadyExistsException.class,
            ProductAttributeValueAlreadyExistsException.class,
            ProductCategoryNotActiveException.class,
            CustomerDocumentAlreadyExistsException.class
    })
    public ResponseEntity<ErrorResponse> handleConflict(
            RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI()
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
                        request.getRequestURI()
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
                        request.getRequestURI()
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
                        request.getRequestURI()
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
                        request.getRequestURI()
                ));
    }

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientStock(
            InsufficientStockException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI()
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
                        request.getRequestURI()
                ));
    }

    @ExceptionHandler({
            InvalidOrderException.class,
            InvalidOrderStatusTransitionException.class,
            QuickSaleValidationException.class,
            InsufficientStockForEditException.class
    })
    public ResponseEntity<ErrorResponse> handleInvalidOrder(
            RuntimeException ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ErrorResponse.of(
                        HttpStatus.BAD_REQUEST.value(),
                        HttpStatus.BAD_REQUEST.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI()
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
                        request.getRequestURI()
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
                        request.getRequestURI()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                        ex.getMessage(),
                        request.getRequestURI()
                ));
    }
}

