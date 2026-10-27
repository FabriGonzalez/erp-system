import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { ErrorMessages, parseResponse, toApiError } from '@/services/api-error';
import { saveResponseAsFile } from '@/services/save-file';
import { ImportFile, ProductImportResult } from '@/types/product-import';

const IMPORTS_URL = `${API_BASE_URL}/api/v1/imports/products`;
const TEMPLATE_NAME = 'plantilla-productos.xlsx';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const TOO_LARGE = 'El archivo supera los 2 MB. Dividilo en varios y subilos de a uno.';

const IMPORT_ERRORS: Omit<ErrorMessages, 'fallback'> = {
    byCode: {
        FILE_TOO_LARGE: TOO_LARGE,
        INVALID_PARAMETER: 'No se recibió el archivo. Elegilo de nuevo.',
    },
    byStatus: {
        403: 'Importar productos requiere el permiso "Administrar productos".',
        413: TOO_LARGE,
    },
};

/** Sin Content-Type: fetch lo arma con el boundary del multipart. */
function authHeaders(token: string): HeadersInit {
    return { Authorization: `Bearer ${token}` };
}

function fileForm(file: ImportFile): FormData {
    const form = new FormData();
    if (file.file) {
        form.append('file', file.file, file.name);
    } else {
        // React Native sube el archivo desde su uri con este objeto.
        form.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
    }
    return form;
}

/** Lee y valida el archivo sin guardar nada. */
export async function previewProductImport(file: ImportFile, token: string): Promise<ProductImportResult> {
    const response = await apiFetch(`${IMPORTS_URL}/preview`, {
        method: 'POST',
        headers: authHeaders(token),
        body: fileForm(file),
    });
    return parseResponse<ProductImportResult>(response, { ...IMPORT_ERRORS, fallback: 'No se pudo leer el archivo.' });
}

/**
 * Valida de nuevo y, sin errores, guarda todo junto (applied). Si el catálogo cambió desde la
 * previsualización, vuelve con applied en false y los errores nuevos.
 */
export async function importProducts(file: ImportFile, token: string): Promise<ProductImportResult> {
    const response = await apiFetch(IMPORTS_URL, {
        method: 'POST',
        headers: authHeaders(token),
        body: fileForm(file),
    });
    return parseResponse<ProductImportResult>(response, { ...IMPORT_ERRORS, fallback: 'No se pudo importar el archivo.' });
}

/** Web: la descarga. Celular: abre el menú de compartir. */
export async function downloadImportTemplate(token: string): Promise<void> {
    const response = await apiFetch(`${IMPORTS_URL}/template`, { headers: authHeaders(token) });
    if (!response.ok) {
        throw await toApiError(response, { ...IMPORT_ERRORS, fallback: 'No se pudo descargar la plantilla.' });
    }
    await saveResponseAsFile(response, TEMPLATE_NAME, XLSX_MIME);
}
