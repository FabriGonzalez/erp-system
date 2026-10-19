import {
    Product,
    ProductRequest,
    ProductResponse,
    ProductVariant,
    ProductUpdateRequest,
} from '@/types/product';
import { API_BASE_URL, apiFetch } from '@/services/api-client';
import { BRANCH_ACCESS_ERRORS, parseResponse } from '@/services/api-error';

const PRODUCT_ERRORS = {
    byCode: {
        ...BRANCH_ACCESS_ERRORS,
        PRODUCT_SKU_ALREADY_EXISTS: 'Ya existe un producto con ese SKU.',
        VARIANT_SKU_ALREADY_EXISTS: 'Ya existe una variante con ese SKU. Cada variante necesita un SKU único.',
        CATEGORY_INACTIVE: 'La categoría está inactiva. Elegí otra o activala antes de guardar.',
        INVALID_PRODUCT_VARIANTS:
            'Las variantes no son válidas: una variante sin atributos tiene que ser la única del producto, cada variante lleva un solo valor por atributo y una sucursal no se puede repetir en el stock.',
        ATTRIBUTE_VALUE_ALREADY_EXISTS: 'Ese valor de atributo ya existe.',
    },
    byStatus: {
        404: 'Producto, categoría, sucursal o atributo no encontrados.',
        409: 'El producto ya existe.',
    },
};

function handleResponse<T>(response: Response, fallback: string): Promise<T> {
    return parseResponse<T>(response, { ...PRODUCT_ERRORS, fallback });
}

function authHeaders(token: string): HeadersInit {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

function normalizeProduct(data: ProductResponse): Product {
    return {
        id: String(data.id),
        name: data.name,
        description: data.description ?? undefined,
        categoryId: String(data.categoryId),
        categoryName: data.categoryName ?? undefined,
        active: data.active,
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
        variants: data.variants.map(
            (variant): ProductVariant => ({
                id: String(variant.id),
                sku: variant.sku,
                price: Number(variant.price),
                active: variant.active,
                createdAt: variant.createdAt ?? null,
                updatedAt: variant.updatedAt ?? null,
                attributes: variant.attributes.map((attribute) => ({
                    attributeId: String(attribute.attributeId),
                    attributeValueId: String(attribute.id),
                    attributeName: attribute.attributeName,
                    valueName: attribute.value,
                })),
                stockByBranch: Object.fromEntries(
                    (variant.stock ?? []).map((stock) => [
                        String(stock.branchId),
                        stock.quantity,
                    ])
                ),
            })
        ),
    };
}

export async function getAllProducts(token: string): Promise<Product[]> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/products`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const rawList = await handleResponse<ProductResponse[]>(
        response,
        'No se pudieron obtener los productos.'
    );

    return rawList.map(normalizeProduct);
}

export async function getProductById(
    id: string,
    token: string
): Promise<Product> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/products/${id}`, {
        method: 'GET',
        headers: authHeaders(token),
    });

    const raw = await handleResponse<ProductResponse>(
        response,
        'No se pudo obtener el producto.'
    );

    return normalizeProduct(raw);
}

export async function createProduct(
    data: ProductRequest,
    token: string
): Promise<Product> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/products`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
            name: data.name.trim(),
            description: data.description?.trim() || null,
            categoryId: data.categoryId,
            variants: data.variants.map((variant) => ({
                sku: variant.sku.trim(),
                price: variant.price,
                attributeValueIds: variant.attributeValueIds,
                ...(variant.initialStock
                    ? { initialStock: variant.initialStock }
                    : {}),
            })),
        }),
    });

    const raw = await handleResponse<ProductResponse>(
        response,
        'No se pudo crear el producto.'
    );

    return normalizeProduct(raw);
}

export async function updateProduct(
    id: string,
    data: ProductUpdateRequest,
    token: string
): Promise<Product> {
    const response = await apiFetch(`${API_BASE_URL}/api/v1/products/${id}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({
            name: data.name.trim(),
            description: data.description?.trim() || null,
            categoryId: data.categoryId,
            variants: data.variants.map((variant) => ({
                sku: variant.sku.trim(),
                price: variant.price,
                attributeValueIds: variant.attributeValueIds,
                stock: variant.stock,
            })),
        }),
    });

    const raw = await handleResponse<ProductResponse>(
        response,
        'No se pudo actualizar el producto.'
    );

    return normalizeProduct(raw);
}

export async function activateProduct(
    id: string,
    token: string
): Promise<Product> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/products/${id}/activate`,
        {
            method: 'PATCH',
            headers: authHeaders(token),
        }
    );

    const raw = await handleResponse<ProductResponse>(
        response,
        'No se pudo activar el producto.'
    );

    return normalizeProduct(raw);
}

export async function deactivateProduct(
    id: string,
    token: string
): Promise<Product> {
    const response = await apiFetch(
        `${API_BASE_URL}/api/v1/products/${id}/deactivate`,
        {
            method: 'PATCH',
            headers: authHeaders(token),
        }
    );

    const raw = await handleResponse<ProductResponse>(
        response,
        'No se pudo desactivar el producto.'
    );

    return normalizeProduct(raw);
}
