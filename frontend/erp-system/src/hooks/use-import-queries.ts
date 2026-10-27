import { useMutation } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import { downloadImportTemplate, importProducts, previewProductImport } from '@/services/import-service';
import { ImportFile, ProductImportResult } from '@/types/product-import';

import { invalidateStockViews, productKeys, promotionKeys } from './catalog-keys';
import { attributeKeys } from './use-attribute-queries';
import { categoryKeys } from './use-category-queries';
import { requireToken } from './use-paged-list';

export function useDownloadImportTemplate() {
    return useMutation({
        mutationFn: () => downloadImportTemplate(requireToken()),
    });
}

/** No guarda nada: el resultado vive en la pantalla. */
export function usePreviewProductImport() {
    return useMutation({
        mutationFn: (file: ImportFile) => previewProductImport(file, requireToken()),
    });
}

/** Una importación puede crear categorías, atributos y productos, y cambiar precios y stock. */
function syncAfterImport(result: ProductImportResult) {
    if (!result.applied) return;
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
    void queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    void queryClient.invalidateQueries({ queryKey: attributeKeys.all });
    invalidateStockViews();
}

export function useImportProducts() {
    return useMutation({
        mutationFn: (file: ImportFile) => importProducts(file, requireToken()),
        onSuccess: syncAfterImport,
    });
}
