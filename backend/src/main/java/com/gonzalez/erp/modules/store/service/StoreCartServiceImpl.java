package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import com.gonzalez.erp.modules.store.dto.StoreCartLineStatus;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartRequest;
import com.gonzalez.erp.modules.store.dto.StoreFulfillment;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository.BranchVariantStock;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Única evaluación del carrito: la cotización y, después, el checkout. Una línea vencida en el
 * navegador del comprador no es un error del pedido: vuelve marcada para que el sitio la muestre.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreCartServiceImpl implements StoreCartService {

    private final StoreCatalogRepository catalogRepository;
    private final CompanyRepository companyRepository;

    @Override
    public StoreCartQuoteResponse quote(StoreCartRequest request) {
        Company company = companyRepository.findById(CurrentStore.require().companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
        return quote(company, request);
    }

    StoreCartQuoteResponse quote(Company company, StoreCartRequest request) {
        Map<Long, Integer> itemQuantities = mergeRepeatedVariants(orEmpty(request.items()));
        List<StoreCartRequest.Promo> promos = orEmpty(request.promos());
        Map<Long, ProductVariant> variants = sellableVariants(company, itemQuantities.keySet(), promos);
        Map<Long, Promotion> promotions = promos.isEmpty() ? Map.of() : visiblePromotions(company);

        List<Map<Long, Long>> promoUnits = promos.stream()
                .map(promo -> unitsOf(promo, promotions.get(promo.promotionId()), variants))
                .toList();

        // Una variante puede ir suelta y dentro de una promo: el stock se mide por el total.
        Map<Long, Long> demand = new HashMap<>();
        itemQuantities.forEach((variantId, quantity) -> {
            if (variants.containsKey(variantId)) {
                demand.merge(variantId, quantity.longValue(), Long::sum);
            }
        });
        promoUnits.forEach(units -> units.forEach((variantId, quantity) -> demand.merge(variantId, quantity, Long::sum)));

        List<BranchVariantStock> stock = demand.isEmpty()
                ? List.of()
                : catalogRepository.findStoreStock(company.getId(), demand.keySet());
        Map<Long, Long> totalStock = stock.stream().collect(Collectors.groupingBy(
                BranchVariantStock::getVariantId, Collectors.summingLong(BranchVariantStock::getQuantity)));

        List<StoreCartQuoteResponse.Item> items = itemQuantities.entrySet().stream()
                .map(entry -> itemLine(entry.getKey(), entry.getValue(), variants.get(entry.getKey()), company, demand, totalStock))
                .toList();
        List<StoreCartQuoteResponse.Promo> promoLines = new ArrayList<>();
        for (int index = 0; index < promos.size(); index++) {
            StoreCartRequest.Promo promo = promos.get(index);
            promoLines.add(promoLine(promo, promotions.get(promo.promotionId()), promoUnits.get(index), company, demand, totalStock));
        }

        BigDecimal total = Stream.concat(
                        items.stream().filter(line -> line.status() == StoreCartLineStatus.AVAILABLE).map(StoreCartQuoteResponse.Item::lineTotal),
                        promoLines.stream().filter(line -> line.status() == StoreCartLineStatus.AVAILABLE).map(StoreCartQuoteResponse.Promo::lineTotal))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        boolean purchasable = !(items.isEmpty() && promoLines.isEmpty())
                && items.stream().allMatch(line -> line.status() == StoreCartLineStatus.AVAILABLE)
                && promoLines.stream().allMatch(line -> line.status() == StoreCartLineStatus.AVAILABLE);
        if (!purchasable) {
            return new StoreCartQuoteResponse(items, promoLines, total, StoreFulfillment.UNAVAILABLE, List.of());
        }

        List<StoreCartQuoteResponse.PickupBranch> pickupBranches = branchesThatFulfill(company, demand, stock);
        StoreFulfillment fulfillment = pickupBranches.isEmpty()
                ? StoreFulfillment.MULTIPLE_BRANCHES
                : StoreFulfillment.SINGLE_BRANCH;
        return new StoreCartQuoteResponse(items, promoLines, total, fulfillment, pickupBranches);
    }

    private static Map<Long, Integer> mergeRepeatedVariants(List<StoreCartRequest.Item> items) {
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        items.forEach(item -> quantities.merge(item.productVariantId(), item.quantity(), Integer::sum));
        return quantities;
    }

    private Map<Long, ProductVariant> sellableVariants(Company company, Set<Long> itemVariantIds,
                                                       List<StoreCartRequest.Promo> promos) {
        Set<Long> variantIds = new HashSet<>(itemVariantIds);
        promos.forEach(promo -> promo.variants().forEach(choice -> variantIds.add(choice.productVariantId())));
        if (variantIds.isEmpty()) {
            return Map.of();
        }
        return catalogRepository.findSellableVariants(company.getId(), variantIds).stream()
                .collect(Collectors.toMap(ProductVariant::getId, Function.identity()));
    }

    private Map<Long, Promotion> visiblePromotions(Company company) {
        return catalogRepository.findVisiblePromotions(company.getId(), BusinessDate.today()).stream()
                .collect(Collectors.toMap(Promotion::getId, Function.identity()));
    }

    /**
     * Unidades de cada variante que consume la línea. Vacío si no se puede comprar: promo no
     * visible, o variantes que no cubren exactamente lo que lleva de cada producto.
     */
    private static Map<Long, Long> unitsOf(StoreCartRequest.Promo promo, Promotion promotion,
                                           Map<Long, ProductVariant> variants) {
        if (promotion == null) {
            return Map.of();
        }
        Map<Long, Integer> requiredByProduct = promotion.getItems().stream()
                .collect(Collectors.toMap(item -> item.getProduct().getId(), PromotionItem::getQuantity));

        Map<Long, Integer> chosenByProduct = new HashMap<>();
        Map<Long, Long> units = new HashMap<>();
        for (StoreCartRequest.Item choice : promo.variants()) {
            ProductVariant variant = variants.get(choice.productVariantId());
            if (variant == null) {
                return Map.of();
            }
            chosenByProduct.merge(variant.getProduct().getId(), choice.quantity(), Integer::sum);
            units.merge(variant.getId(), (long) choice.quantity() * promo.quantity(), Long::sum);
        }
        return chosenByProduct.equals(requiredByProduct) ? units : Map.of();
    }

    private static StoreCartQuoteResponse.Item itemLine(Long variantId, int quantity, ProductVariant variant, Company company,
                                                        Map<Long, Long> demand, Map<Long, Long> totalStock) {
        if (variant == null) {
            return new StoreCartQuoteResponse.Item(variantId, null, quantity, null, null, StoreCartLineStatus.UNAVAILABLE);
        }
        BigDecimal unitPrice = StorePrices.webPrice(variant.getPrice(), company);
        return new StoreCartQuoteResponse.Item(variantId, variant.getProduct().getName(), quantity, unitPrice,
                unitPrice.multiply(BigDecimal.valueOf(quantity)), stockStatus(Set.of(variantId), demand, totalStock));
    }

    private static StoreCartQuoteResponse.Promo promoLine(StoreCartRequest.Promo promo, Promotion promotion, Map<Long, Long> units,
                                                          Company company, Map<Long, Long> demand, Map<Long, Long> totalStock) {
        if (units.isEmpty()) {
            return new StoreCartQuoteResponse.Promo(promo.promotionId(), null, promo.quantity(), null, null, StoreCartLineStatus.UNAVAILABLE);
        }
        BigDecimal unitPrice = StorePrices.webPrice(promotion.getPrice(), company);
        return new StoreCartQuoteResponse.Promo(promo.promotionId(), promotion.getName(), promo.quantity(), unitPrice,
                unitPrice.multiply(BigDecimal.valueOf(promo.quantity())), stockStatus(units.keySet(), demand, totalStock));
    }

    private static StoreCartLineStatus stockStatus(Set<Long> variantIds, Map<Long, Long> demand, Map<Long, Long> totalStock) {
        boolean enough = variantIds.stream()
                .allMatch(variantId -> demand.get(variantId) <= totalStock.getOrDefault(variantId, 0L));
        return enough ? StoreCartLineStatus.AVAILABLE : StoreCartLineStatus.INSUFFICIENT_STOCK;
    }

    private List<StoreCartQuoteResponse.PickupBranch> branchesThatFulfill(Company company, Map<Long, Long> demand,
                                                                          List<BranchVariantStock> stock) {
        Map<Long, Map<Long, Integer>> stockByBranch = stock.stream().collect(Collectors.groupingBy(
                BranchVariantStock::getBranchId,
                Collectors.toMap(BranchVariantStock::getVariantId, BranchVariantStock::getQuantity)));

        List<StoreCartQuoteResponse.PickupBranch> branches = new ArrayList<>();
        for (Branch branch : catalogRepository.findStoreBranches(company.getId())) {
            Map<Long, Integer> available = stockByBranch.getOrDefault(branch.getId(), Map.of());
            boolean fulfills = demand.entrySet().stream()
                    .allMatch(entry -> entry.getValue() <= available.getOrDefault(entry.getKey(), 0));
            if (fulfills) {
                branches.add(new StoreCartQuoteResponse.PickupBranch(branch.getId(), branch.getName(), branch.getAddress()));
            }
        }
        return branches;
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list != null ? list : List.of();
    }
}
