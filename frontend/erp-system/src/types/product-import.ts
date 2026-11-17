/** Qué hace la importación con una fila (ProductImportAction del backend). */
export type ProductImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'ERROR';

/** Los textos ya vienen en español del backend: son datos para mostrar, no errores de la API. */
export type ProductImportRow = {
    /** Número de fila como lo muestra Excel (los encabezados son la 1). */
    row: number;
    action: ProductImportAction;
    product: string | null;
    /** El del archivo o, si vino vacío, el que se va a generar. */
    sku: string | null;
    changes: string[];
    errors: string[];
    warnings: string[];
};

export type ProductImportResult = {
    /** Sin errores: se puede confirmar. */
    valid: boolean;
    /** true solo si se guardó. */
    applied: boolean;
    rowsRead: number;
    productsToCreate: number;
    variantsToCreate: number;
    variantsToUpdate: number;
    variantsUnchanged: number;
    rowsWithErrors: number;
    categoriesToCreate: string[];
    attributesToCreate: string[];
    /** Problemas del archivo entero (formato, columnas); con alguno no hay filas. */
    fileErrors: string[];
    rows: ProductImportRow[];
};

/** Archivo elegido con expo-document-picker; en web trae además el File del navegador. */
export type ImportFile = {
    name: string;
    uri: string;
    mimeType?: string;
    size?: number;
    file?: File;
};
