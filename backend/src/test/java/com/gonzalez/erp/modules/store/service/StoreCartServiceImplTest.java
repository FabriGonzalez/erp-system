package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import com.gonzalez.erp.modules.store.dto.StoreCartLineStatus;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartRequest;
import com.gonzalez.erp.modules.store.dto.StoreFulfillment;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository.BranchVariantStock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Precios web, disponibilidad por línea y qué sucursales pueden armar el carrito. */
@ExtendWith(MockitoExtension.class)
class StoreCartServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long CENTRO_ID = 10L;
    private static final Long NORTE_ID = 11L;
    private static final Long SHIRT_M = 40L;
    private static final Long SHIRT_L = 41L;
    private static final Long CAP = 42L;
    private static final Long PROMOTION_ID = 70L;

    @Mock private StoreCatalogRepository catalogRepository;
    @Mock private CompanyRepository companyRepository;

    @InjectMocks private StoreCartServiceImpl cartService;

    private record StockRow(Long getBranchId, Long getVariantId, Integer getQuantity) implements BranchVariantStock {}

    private Company company;
    private Product shirt;
    private Branch centro;
    private Branch norte;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme")
                .storePriceAdjustmentPercent(new BigDecimal("10")).storeRoundingStep(10).build();
        company.setId(COMPANY_ID);
        shirt = Product.builder().name("Remera").company(company).build();
        shirt.setId(50L);
        centro = branch(CENTRO_ID, "Centro");
        norte = branch(NORTE_ID, "Norte");
    }

    @Test
    void aBranchThatHasEverythingIsOfferedForPickup() {
        stubVariants(variant(SHIRT_M, shirt, "1000"));
        stubStock(new StockRow(CENTRO_ID, SHIRT_M, 5), new StockRow(NORTE_ID, SHIRT_M, 1));
        stubBranches();

        StoreCartQuoteResponse quote = cartService.quote(company, cart(item(SHIRT_M, 2)));

        assertThat(quote.items()).singleElement().satisfies(line -> {
            assertThat(line.productName()).isEqualTo("Remera");
            assertThat(line.unitPrice()).isEqualByComparingTo("1100");
            assertThat(line.lineTotal()).isEqualByComparingTo("2200");
            assertThat(line.status()).isEqualTo(StoreCartLineStatus.AVAILABLE);
        });
        assertThat(quote.total()).isEqualByComparingTo("2200");
        assertThat(quote.fulfillment()).isEqualTo(StoreFulfillment.SINGLE_BRANCH);
        assertThat(quote.pickupBranches()).extracting(StoreCartQuoteResponse.PickupBranch::id).containsExactly(CENTRO_ID);
    }

    @Test
    void whenNoBranchHasEverythingTheOrderNeedsSeveralBranches() {
        Product cap = Product.builder().name("Gorra").company(company).build();
        cap.setId(51L);
        stubVariants(variant(SHIRT_M, shirt, "1000"), variant(CAP, cap, "500"));
        stubStock(new StockRow(CENTRO_ID, SHIRT_M, 5), new StockRow(NORTE_ID, CAP, 5));
        stubBranches();

        StoreCartQuoteResponse quote = cartService.quote(company, cart(item(SHIRT_M, 1), item(CAP, 1)));

        assertThat(quote.fulfillment()).isEqualTo(StoreFulfillment.MULTIPLE_BRANCHES);
        assertThat(quote.pickupBranches()).isEmpty();
    }

    @Test
    void notEnoughStockBetweenAllBranchesMakesTheCartUnavailable() {
        stubVariants(variant(SHIRT_M, shirt, "1000"));
        stubStock(new StockRow(CENTRO_ID, SHIRT_M, 2), new StockRow(NORTE_ID, SHIRT_M, 1));

        StoreCartQuoteResponse quote = cartService.quote(company, cart(item(SHIRT_M, 4)));

        assertThat(quote.items().get(0).status()).isEqualTo(StoreCartLineStatus.INSUFFICIENT_STOCK);
        assertThat(quote.total()).isEqualByComparingTo("0");
        assertThat(quote.fulfillment()).isEqualTo(StoreFulfillment.UNAVAILABLE);
        verify(catalogRepository, never()).findStoreBranches(any());
    }

    @Test
    void aVariantThatIsNoLongerSoldComesBackMarked() {
        stubVariants();

        StoreCartQuoteResponse quote = cartService.quote(company, cart(item(SHIRT_M, 1)));

        assertThat(quote.items()).singleElement().satisfies(line -> {
            assertThat(line.status()).isEqualTo(StoreCartLineStatus.UNAVAILABLE);
            assertThat(line.unitPrice()).isNull();
        });
        assertThat(quote.fulfillment()).isEqualTo(StoreFulfillment.UNAVAILABLE);
    }

    @Test
    void repeatedVariantsAreMergedIntoOneLine() {
        stubVariants(variant(SHIRT_M, shirt, "1000"));
        stubStock(new StockRow(CENTRO_ID, SHIRT_M, 5));
        stubBranches();

        StoreCartQuoteResponse quote = cartService.quote(company, cart(item(SHIRT_M, 1), item(SHIRT_M, 2)));

        assertThat(quote.items()).singleElement().satisfies(line -> assertThat(line.quantity()).isEqualTo(3));
    }

    @Test
    void aPromoCanMixVariantsOfTheSameProduct() {
        stubVariants(variant(SHIRT_M, shirt, "1000"), variant(SHIRT_L, shirt, "1000"));
        stubPromotion("1500", 2);
        stubStock(new StockRow(CENTRO_ID, SHIRT_M, 2), new StockRow(CENTRO_ID, SHIRT_L, 2));
        stubBranches();

        StoreCartQuoteResponse quote = cartService.quote(company, promoCart(2, item(SHIRT_M, 1), item(SHIRT_L, 1)));

        assertThat(quote.promos()).singleElement().satisfies(line -> {
            assertThat(line.unitPrice()).isEqualByComparingTo("1650");
            assertThat(line.lineTotal()).isEqualByComparingTo("3300");
            assertThat(line.status()).isEqualTo(StoreCartLineStatus.AVAILABLE);
        });
        assertThat(quote.fulfillment()).isEqualTo(StoreFulfillment.SINGLE_BRANCH);
    }

    @Test
    void variantsThatDoNotCompleteThePromoMakeItUnavailable() {
        stubVariants(variant(SHIRT_M, shirt, "1000"));
        stubPromotion("1500", 2);

        StoreCartQuoteResponse quote = cartService.quote(company, promoCart(1, item(SHIRT_M, 1)));

        assertThat(quote.promos().get(0).status()).isEqualTo(StoreCartLineStatus.UNAVAILABLE);
    }

    @Test
    void aVariantSoldAloneAndInsideAPromoIsMeasuredByTheTotal() {
        stubVariants(variant(SHIRT_M, shirt, "1000"));
        stubPromotion("1500", 2);
        stubStock(new StockRow(CENTRO_ID, SHIRT_M, 2));

        StoreCartQuoteResponse quote = cartService.quote(company,
                new StoreCartRequest(List.of(item(SHIRT_M, 1)), List.of(promo(1, item(SHIRT_M, 2)))));

        assertThat(quote.items().get(0).status()).isEqualTo(StoreCartLineStatus.INSUFFICIENT_STOCK);
        assertThat(quote.promos().get(0).status()).isEqualTo(StoreCartLineStatus.INSUFFICIENT_STOCK);
    }

    @Test
    void anEmptyCartHasNothingToFulfill() {
        StoreCartQuoteResponse quote = cartService.quote(company, new StoreCartRequest(null, null));

        assertThat(quote.total()).isEqualByComparingTo("0");
        assertThat(quote.fulfillment()).isEqualTo(StoreFulfillment.UNAVAILABLE);
    }

    private void stubVariants(ProductVariant... variants) {
        when(catalogRepository.findSellableVariants(eq(COMPANY_ID), anyCollection())).thenReturn(List.of(variants));
    }

    private void stubStock(BranchVariantStock... rows) {
        when(catalogRepository.findStoreStock(eq(COMPANY_ID), anyCollection())).thenReturn(List.of(rows));
    }

    private void stubBranches() {
        when(catalogRepository.findStoreBranches(COMPANY_ID)).thenReturn(List.of(centro, norte));
    }

    private void stubPromotion(String price, int shirtsPerPromo) {
        Promotion promotion = Promotion.builder().name("Dúo").price(new BigDecimal(price)).company(company)
                .items(List.of(PromotionItem.builder().product(shirt).quantity(shirtsPerPromo).build()))
                .build();
        promotion.setId(PROMOTION_ID);
        when(catalogRepository.findVisiblePromotions(eq(COMPANY_ID), any())).thenReturn(List.of(promotion));
    }

    private Branch branch(Long id, String name) {
        Branch branch = Branch.builder().name(name).company(company).build();
        branch.setId(id);
        return branch;
    }

    private ProductVariant variant(Long id, Product product, String price) {
        ProductVariant variant = ProductVariant.builder().product(product).sku("SKU-" + id)
                .price(new BigDecimal(price)).company(company).build();
        variant.setId(id);
        return variant;
    }

    private static StoreCartRequest.Item item(Long variantId, int quantity) {
        return new StoreCartRequest.Item(variantId, quantity);
    }

    private static StoreCartRequest.Promo promo(int quantity, StoreCartRequest.Item... variants) {
        return new StoreCartRequest.Promo(PROMOTION_ID, quantity, List.of(variants));
    }

    private static StoreCartRequest cart(StoreCartRequest.Item... items) {
        return new StoreCartRequest(List.of(items), null);
    }

    private static StoreCartRequest promoCart(int quantity, StoreCartRequest.Item... variants) {
        return new StoreCartRequest(null, List.of(promo(quantity, variants)));
    }
}
