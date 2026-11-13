import { Branch } from '@/types/branch';
import { Order } from '@/types/order';
import { Stock } from '@/types/stock';

/** Una variante del pedido con las unidades que lleva, sueltas y dentro de promos. */
export type NeededLine = {
    variantId: string;
    label: string;
    quantity: number;
};

export type TransferSuggestion = {
    originBranchId: string;
    originBranchName: string;
    items: NeededLine[];
};

/** Qué pasa si el pedido se arma en esta sucursal. */
export type BranchOption = {
    branchId: string;
    branchName: string;
    /** La sucursal provisoria del pedido: la primera por prioridad de la tienda. */
    isProvisional: boolean;
    fulfills: boolean;
    /** Lo que le falta a esta sucursal. */
    missing: NeededLine[];
    /** De dónde traer lo que falta, una transferencia por sucursal de origen. */
    transfers: TransferSuggestion[];
    /** Lo que no alcanza ni juntando el stock de toda la empresa. */
    uncovered: NeededLine[];
    /** Todas las transferencias salen de sucursales del usuario y no queda nada sin cubrir. */
    canTransferFromMine: boolean;
    recommended: boolean;
};

/** Las variantes del pedido, como las descuenta el backend: sueltas más las de las promos. */
export function neededLines(order: Order): NeededLine[] {
    const lines = new Map<string, NeededLine>();

    function add(variantId: string, label: string, quantity: number) {
        const current = lines.get(variantId);
        lines.set(variantId, { variantId, label: current?.label ?? label, quantity: (current?.quantity ?? 0) + quantity });
    }

    for (const item of order.items) {
        add(item.variantId, `${item.productName} (${item.productSku})`, item.quantity);
    }
    for (const promo of order.promos) {
        for (const component of promo.components) {
            const variant = component.variantName || component.sku;
            add(component.variantId, `${component.productName} (${variant})`, component.quantity * promo.quantity);
        }
    }
    return [...lines.values()];
}

/**
 * Para cada sucursal del usuario: si arma el pedido o qué transferencias lo completarían, con la
 * recomendada primero. Las transferencias salen primero de sucursales del usuario (las únicas
 * que puede usar como origen) y, entre ellas, de las que cubren más unidades, para hacer menos.
 */
export function assignmentOptions(
    needed: NeededLine[],
    stocks: Stock[],
    destinations: Branch[],
    provisionalBranchId: string,
    myBranchIds: Set<string>,
): BranchOption[] {
    const quantities = new Map<string, Map<string, number>>();
    const branchNames = new Map<string, string>();
    for (const stock of stocks) {
        const byVariant = quantities.get(stock.branchId) ?? new Map<string, number>();
        byVariant.set(stock.productVariantId, stock.quantity);
        quantities.set(stock.branchId, byVariant);
        branchNames.set(stock.branchId, stock.branchName);
    }
    const available = (branchId: string, variantId: string) =>
        Math.max(0, quantities.get(branchId)?.get(variantId) ?? 0);

    const options = destinations.map((branch): BranchOption => {
        const missing = needed
            .map((line) => ({ ...line, quantity: line.quantity - available(branch.id, line.variantId) }))
            .filter((line) => line.quantity > 0);

        const remaining = new Map(missing.map((line) => [line.variantId, line.quantity]));
        const origins = [...quantities.keys()].filter((id) => id !== branch.id);
        const transfers = [
            ...planTransfers(remaining, origins.filter((id) => myBranchIds.has(id)), available, branchNames, needed),
            ...planTransfers(remaining, origins.filter((id) => !myBranchIds.has(id)), available, branchNames, needed),
        ];
        const uncovered = needed
            .filter((line) => (remaining.get(line.variantId) ?? 0) > 0)
            .map((line) => ({ ...line, quantity: remaining.get(line.variantId) ?? 0 }));

        return {
            branchId: branch.id,
            branchName: branch.name,
            isProvisional: branch.id === provisionalBranchId,
            fulfills: missing.length === 0,
            missing,
            transfers,
            uncovered,
            canTransferFromMine: uncovered.length === 0
                && transfers.every((transfer) => myBranchIds.has(transfer.originBranchId)),
            recommended: false,
        };
    });

    const best = pickRecommended(options);
    if (best) best.recommended = true;

    return options.sort((a, b) =>
        Number(b.recommended) - Number(a.recommended)
        || Number(b.fulfills) - Number(a.fulfills)
        || Number(b.isProvisional) - Number(a.isProvisional)
        || a.transfers.length - b.transfers.length
        || a.branchName.localeCompare(b.branchName));
}

/** Va tomando del origen que más unidades cubre; descuenta de remaining lo que consigue. */
function planTransfers(
    remaining: Map<string, number>,
    origins: string[],
    available: (branchId: string, variantId: string) => number,
    branchNames: Map<string, string>,
    needed: NeededLine[],
): TransferSuggestion[] {
    const transfers: TransferSuggestion[] = [];
    const pending = new Set(origins);
    const covers = (origin: string) =>
        [...remaining].reduce((sum, [variantId, quantity]) => sum + Math.min(quantity, available(origin, variantId)), 0);

    while ([...remaining.values()].some((quantity) => quantity > 0) && pending.size > 0) {
        const origin = [...pending].sort((a, b) => covers(b) - covers(a) || a.localeCompare(b))[0];
        pending.delete(origin);
        if (covers(origin) === 0) break;

        const items = needed
            .map((line) => ({
                ...line,
                quantity: Math.min(remaining.get(line.variantId) ?? 0, available(origin, line.variantId)),
            }))
            .filter((line) => line.quantity > 0);
        for (const item of items) {
            remaining.set(item.variantId, (remaining.get(item.variantId) ?? 0) - item.quantity);
        }
        transfers.push({ originBranchId: origin, originBranchName: branchNames.get(origin) ?? '', items });
    }
    return transfers;
}

/**
 * La que arma todo (mejor la provisoria); si ninguna, la que se completa con menos
 * transferencias, mejor si el usuario puede hacerlas y si es la provisoria.
 */
function pickRecommended(options: BranchOption[]): BranchOption | undefined {
    const score = (option: BranchOption) => [
        option.fulfills ? 0 : 1,
        option.canTransferFromMine ? 0 : 1,
        option.transfers.length,
        option.isProvisional ? 0 : 1,
    ];
    return options
        .filter((option) => option.uncovered.length === 0)
        .sort((a, b) => {
            const [sa, sb] = [score(a), score(b)];
            const index = sa.findIndex((value, i) => value !== sb[i]);
            return index < 0 ? 0 : sa[index] - sb[index];
        })[0];
}

/** Misma sugerencia: mismos orígenes, variantes y cantidades. */
export function sameTransfers(a: TransferSuggestion[], b: TransferSuggestion[]): boolean {
    const key = (transfers: TransferSuggestion[]) => JSON.stringify(transfers.map((transfer) => [
        transfer.originBranchId,
        transfer.items.map((item) => [item.variantId, item.quantity]),
    ]));
    return key(a) === key(b);
}
