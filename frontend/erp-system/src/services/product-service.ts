import {
    Product,
    ProductRequest,
    ProductResponse,
    ProductVariant,
    ProductUpdateRequest,
} from '@/types/product';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function handleResponse<T>(
    response: Response,
    defaultErrorMessage: string
): Promise<T> {
    if (!response.ok) {
        let errorMessage = '';

        try {
            const errorPayload = await response.json();
            errorMessage = errorPayload?.message ?? '';
        } catch {
            // El backend puede no devolver JSON.
        }

        if (response.status === 401) {
            throw new Error('Sesión expirada.');
        }

        if (response.status === 404) {
            throw new Error(errorMessage || 'Producto no encontrado.');
        }

        if (response.status === 409) {
            throw new Error(errorMessage || 'El producto ya existe.');
        }

        if (response.status >= 500) {
            throw new Error(
                errorMessage || 'Error del servidor. Intentá de nuevo más tarde.'
            );
        }

        throw new Error(errorMessage || defaultErrorMessage);
    }

    if (response.status === 204) {
        return undefined as unknown as T;
    }

    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/v1/products`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/products/${id}`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/products`, {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/products/${id}`, {
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
    const response = await fetch(
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
    const response = await fetch(
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
