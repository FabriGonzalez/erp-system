import { Category, Product, ProductAttribute, ProductAttributeValue } from '@/types/product';

export const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Bombachas de campo', description: 'Bombachas y pantalones tradicionales para trabajo rural.', active: true },
    { id: 'cat-2', name: 'Camisas', description: 'Camisas de campo, trabajo y uso diario.', active: true },
    { id: 'cat-3', name: 'Abrigo', description: 'Buzos, camperas, chalecos y ponchos.', active: true },
    { id: 'cat-4', name: 'Calzado', description: 'Alpargatas y botas para campo.', active: true },
    { id: 'cat-5', name: 'Accesorios', description: 'Cinturones, boinas y accesorios rurales.', active: true },
    { id: 'cat-6', name: 'Pantalones', description: 'Pantalones de gabardina y trabajo rural.', active: true },
];

export const mockAttributes: ProductAttribute[] = [
    { id: 'attr-size', name: 'Talle', active: true },
    { id: 'attr-color', name: 'Color', active: true },
];

export const mockAttributeValues: ProductAttributeValue[] = [
    { id: 'value-size-xs', attributeId: 'attr-size', name: 'XS', active: true },
    { id: 'value-size-s', attributeId: 'attr-size', name: 'S', active: true },
    { id: 'value-size-m', attributeId: 'attr-size', name: 'M', active: true },
    { id: 'value-size-l', attributeId: 'attr-size', name: 'L', active: true },
    { id: 'value-size-xl', attributeId: 'attr-size', name: 'XL', active: true },
    { id: 'value-size-38', attributeId: 'attr-size', name: '38', active: true },
    { id: 'value-size-39', attributeId: 'attr-size', name: '39', active: true },
    { id: 'value-size-40', attributeId: 'attr-size', name: '40', active: true },
    { id: 'value-size-41', attributeId: 'attr-size', name: '41', active: true },
    { id: 'value-size-42', attributeId: 'attr-size', name: '42', active: true },
    { id: 'value-size-43', attributeId: 'attr-size', name: '43', active: true },
    { id: 'value-size-44', attributeId: 'attr-size', name: '44', active: true },
    { id: 'value-size-46', attributeId: 'attr-size', name: '46', active: true },
    { id: 'value-color-black', attributeId: 'attr-color', name: 'Negro', active: true },
    { id: 'value-color-blue', attributeId: 'attr-color', name: 'Azul', active: true },
    { id: 'value-color-brown', attributeId: 'attr-color', name: 'Marrón', active: true },
    { id: 'value-color-beige', attributeId: 'attr-color', name: 'Beige', active: true },
    { id: 'value-color-olive', attributeId: 'attr-color', name: 'Verde oliva', active: true },
];

type VariantSeed = {
    id: string;
    sku: string;
    price: number;
    size?: string;
    color?: string;
};

function variant(productId: string, seed: VariantSeed, stockByBranch: Record<string, number>, index: number) {
    return {
        id: `${productId}-${seed.id}`,
        sku: seed.sku,
        price: seed.price,
        attributes: [
            ...(seed.size ? [{ attributeId: 'attr-size', attributeValueId: `value-size-${seed.size.toLowerCase()}` }] : []),
            ...(seed.color ? [{ attributeId: 'attr-color', attributeValueId: `value-color-${seed.color}` }] : []),
        ],
        stockByBranch: Object.fromEntries(
            Object.entries(stockByBranch).map(([branchId, stock]) => [
                branchId,
                Math.max(0, stock - index * 2),
            ]),
        ),
    };
}

function product(
    id: string,
    name: string,
    categoryId: string,
    categoryName: string,
    description: string,
    stockByBranch: Record<string, number>,
    variants: VariantSeed[],
): Product {
    return {
        id,
        name,
        categoryId,
        categoryName,
        description,
        active: true,
        variants: variants.map((seed, index) => variant(id, seed, stockByBranch, index)),
    };
}

export const mockProducts: Product[] = [
    product('prod-1', 'Bombacha de campo clásica', 'cat-1', 'Bombachas de campo', 'Bombacha de gabardina resistente, ideal para trabajo y uso diario.', { '1': 18, '2': 11, '3': 6 }, [
        { id: '40-brown', sku: 'BCF-001', price: 42000, size: '40', color: 'brown' },
        { id: '42-brown', sku: 'BCF-002', price: 42000, size: '42', color: 'brown' },
        { id: '44-brown', sku: 'BCF-003', price: 45000, size: '44', color: 'brown' },
        { id: '46-brown', sku: 'BCF-004', price: 42000, size: '46', color: 'brown' },
        { id: '40-olive', sku: 'BCF-005', price: 42000, size: '40', color: 'olive' },
        { id: '42-olive', sku: 'BCF-006', price: 42000, size: '42', color: 'olive' },
        { id: '44-olive', sku: 'BCF-007', price: 42000, size: '44', color: 'olive' },
        { id: '46-olive', sku: 'BCF-008', price: 42000, size: '46', color: 'olive' },
    ]),
    product('prod-2', 'Bombacha de campo bordada', 'cat-1', 'Bombachas de campo', 'Bombacha de gabardina con bordado tradicional y calce cómodo.', { '1': 14, '2': 9, '3': 3 }, [
        { id: '40-black', sku: 'BBO-001', price: 46000, size: '40', color: 'black' },
        { id: '42-black', sku: 'BBO-002', price: 46000, size: '42', color: 'black' },
        { id: '44-black', sku: 'BBO-003', price: 46000, size: '44', color: 'black' },
        { id: '46-black', sku: 'BBO-004', price: 46000, size: '46', color: 'black' },
        { id: '40-beige', sku: 'BBO-005', price: 46000, size: '40', color: 'beige' },
        { id: '42-beige', sku: 'BBO-006', price: 46000, size: '42', color: 'beige' },
        { id: '44-beige', sku: 'BBO-007', price: 46000, size: '44', color: 'beige' },
        { id: '46-beige', sku: 'BBO-008', price: 46000, size: '46', color: 'beige' },
    ]),
    product('prod-3', 'Camisa de campo manga larga', 'cat-2', 'Camisas', 'Camisa de algodón reforzado para trabajo rural y jornadas al aire libre.', { '1': 21, '2': 13, '3': 8 }, [
        { id: 's-blue', sku: 'CCM-001', price: 28500, size: 's', color: 'blue' },
        { id: 'm-blue', sku: 'CCM-002', price: 28500, size: 'm', color: 'blue' },
        { id: 'l-blue', sku: 'CCM-003', price: 28500, size: 'l', color: 'blue' },
        { id: 'xl-blue', sku: 'CCM-004', price: 28500, size: 'xl', color: 'blue' },
        { id: 's-beige', sku: 'CCM-005', price: 28500, size: 's', color: 'beige' },
        { id: 'm-beige', sku: 'CCM-006', price: 28500, size: 'm', color: 'beige' },
        { id: 'l-beige', sku: 'CCM-007', price: 28500, size: 'l', color: 'beige' },
        { id: 'xl-beige', sku: 'CCM-008', price: 28500, size: 'xl', color: 'beige' },
    ]),
    product('prod-4', 'Pantalón de gabardina reforzado', 'cat-6', 'Pantalones', 'Pantalón de trabajo con costuras reforzadas y bolsillos amplios.', { '1': 16, '2': 7, '3': 4 }, [
        { id: '38-beige', sku: 'PGR-001', price: 32000, size: '38', color: 'beige' },
        { id: '40-beige', sku: 'PGR-002', price: 32000, size: '40', color: 'beige' },
        { id: '42-beige', sku: 'PGR-003', price: 32000, size: '42', color: 'beige' },
        { id: '44-beige', sku: 'PGR-004', price: 32000, size: '44', color: 'beige' },
        { id: '46-beige', sku: 'PGR-005', price: 32000, size: '46', color: 'beige' },
    ]),
    product('prod-5', 'Buzo de polar patagónico', 'cat-3', 'Abrigo', 'Buzo de polar abrigado para mañanas frías y trabajo en el campo.', { '1': 12, '2': 8, '3': 5 }, [
        { id: 's-olive', sku: 'BPO-001', price: 39000, size: 's', color: 'olive' },
        { id: 'm-olive', sku: 'BPO-002', price: 39000, size: 'm', color: 'olive' },
        { id: 'l-olive', sku: 'BPO-003', price: 39000, size: 'l', color: 'olive' },
        { id: 'xl-olive', sku: 'BPO-004', price: 39000, size: 'xl', color: 'olive' },
        { id: 's-black', sku: 'BPO-005', price: 39000, size: 's', color: 'black' },
        { id: 'm-black', sku: 'BPO-006', price: 39000, size: 'm', color: 'black' },
        { id: 'l-black', sku: 'BPO-007', price: 39000, size: 'l', color: 'black' },
        { id: 'xl-black', sku: 'BPO-008', price: 39000, size: 'xl', color: 'black' },
    ]),
    product('prod-6', 'Campera impermeable de trabajo', 'cat-3', 'Abrigo', 'Campera liviana e impermeable para lluvia y tareas rurales.', { '1': 10, '2': 6, '3': 4 }, [
        { id: 's-olive', sku: 'CIT-001', price: 68000, size: 's', color: 'olive' },
        { id: 'm-olive', sku: 'CIT-002', price: 68000, size: 'm', color: 'olive' },
        { id: 'l-olive', sku: 'CIT-003', price: 68000, size: 'l', color: 'olive' },
        { id: 'xl-olive', sku: 'CIT-004', price: 68000, size: 'xl', color: 'olive' },
    ]),
    product('prod-7', 'Chaleco multipropósito', 'cat-3', 'Abrigo', 'Chaleco de gabardina con bolsillos funcionales para herramientas y accesorios.', { '1': 9, '2': 5, '3': 3 }, [
        { id: 'm-brown', sku: 'CHM-001', price: 54000, size: 'm', color: 'brown' },
        { id: 'l-brown', sku: 'CHM-002', price: 54000, size: 'l', color: 'brown' },
        { id: 'xl-brown', sku: 'CHM-003', price: 54000, size: 'xl', color: 'brown' },
    ]),
    product('prod-8', 'Alpargata de lona reforzada', 'cat-4', 'Calzado', 'Alpargata cómoda de lona con suela reforzada para uso diario.', { '1': 20, '2': 12, '3': 6 }, [
        { id: '39-beige', sku: 'ALR-001', price: 21000, size: '39', color: 'beige' },
        { id: '40-beige', sku: 'ALR-002', price: 21000, size: '40', color: 'beige' },
        { id: '41-beige', sku: 'ALR-003', price: 21000, size: '41', color: 'beige' },
        { id: '42-beige', sku: 'ALR-004', price: 21000, size: '42', color: 'beige' },
        { id: '43-beige', sku: 'ALR-005', price: 21000, size: '43', color: 'beige' },
        { id: '44-beige', sku: 'ALR-006', price: 21000, size: '44', color: 'beige' },
    ]),
    product('prod-9', 'Bota de trabajo con suela tractor', 'cat-4', 'Calzado', 'Bota resistente con suela de alta adherencia para terrenos rurales.', { '1': 8, '2': 5, '3': 2 }, [
        { id: '39-black', sku: 'BTR-001', price: 89000, size: '39', color: 'black' },
        { id: '40-black', sku: 'BTR-002', price: 89000, size: '40', color: 'black' },
        { id: '41-black', sku: 'BTR-003', price: 89000, size: '41', color: 'black' },
        { id: '42-black', sku: 'BTR-004', price: 89000, size: '42', color: 'black' },
        { id: '43-black', sku: 'BTR-005', price: 89000, size: '43', color: 'black' },
        { id: '44-black', sku: 'BTR-006', price: 89000, size: '44', color: 'black' },
    ]),
    product('prod-10', 'Cinturón de cuero crudo', 'cat-5', 'Accesorios', 'Cinturón de cuero con hebilla metálica y terminación artesanal.', { '1': 25, '2': 14, '3': 7 }, [
        { id: 'unique', sku: 'CCU-001', price: 18500 },
    ]),
    product('prod-11', 'Boina de lana criolla', 'cat-5', 'Accesorios', 'Boina clásica de lana para completar la indumentaria rural.', { '1': 18, '2': 10, '3': 5 }, [
        { id: 'black', sku: 'BLC-001', price: 22000, color: 'black' },
    ]),
    product('prod-12', 'Poncho de lana rústica', 'cat-3', 'Abrigo', 'Poncho amplio de lana para abrigo en jornadas de campo.', { '1': 7, '2': 4, '3': 2 }, [
        { id: 'm-brown', sku: 'PON-001', price: 78000, size: 'm', color: 'brown' },
        { id: 'l-brown', sku: 'PON-002', price: 78000, size: 'l', color: 'brown' },
    ]),
];
