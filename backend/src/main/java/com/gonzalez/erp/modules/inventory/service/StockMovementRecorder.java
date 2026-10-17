package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Único lugar donde se crean movimientos de stock: así todos guardan el usuario que los
 * generó. Se llama después de cambiar la cantidad del stock, que pasa a ser newQuantity.
 */
@Component
@RequiredArgsConstructor
public class StockMovementRecorder {

    /** referenceType de los movimientos que genera el alta de un producto con stock inicial. */
    public static final String PRODUCT_CREATION = "PRODUCT_CREATION";
    /** referenceType de los movimientos que genera la edición del stock desde el producto. */
    public static final String PRODUCT_UPDATE = "PRODUCT_UPDATE";

    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;

    /**
     * @param quantity delta con signo: negativo si el stock bajó.
     */
    public StockMovement record(Stock stock, StockMovementType type, int quantity, int previousQuantity,
                                String reason, String referenceType, Long referenceId) {
        return stockMovementRepository.save(StockMovement.builder()
                .stock(stock)
                .type(type)
                .quantity(quantity)
                .previousQuantity(previousQuantity)
                .newQuantity(stock.getQuantity())
                .reason(reason)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .createdBy(userRepository.getReferenceById(SecurityUtils.getCurrentUserId()))
                .build());
    }
}
