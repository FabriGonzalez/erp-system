import { AddressRequest, CustomerAddress } from '@/types/customer';

/** Lo que se tipea en un formulario de dirección, todo como texto. */
export type AddressDraft = {
    label: string;
    street: string;
    number: string;
    floor: string;
    apartment: string;
    city: string;
    state: string;
    postalCode: string;
};

export const EMPTY_ADDRESS_DRAFT: AddressDraft = {
    label: '',
    street: '',
    number: '',
    floor: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
};

/** Borrador a partir de una dirección guardada (para editarla o reenviarla completa). */
export function addressToDraft(address: CustomerAddress): AddressDraft {
    return {
        label: address.label ?? '',
        street: address.street,
        number: address.number ?? '',
        floor: address.floor ?? '',
        apartment: address.apartment ?? '',
        city: address.city,
        state: address.state ?? '',
        postalCode: address.postalCode ?? '',
    };
}

/** Mismas reglas que AddressRequest en el backend: calle y ciudad obligatorias. */
export function validateAddressDraft(draft: AddressDraft): string | null {
    if (!draft.street.trim()) return 'Ingresá la calle.';
    if (!draft.city.trim()) return 'Ingresá la ciudad.';
    return null;
}

export function toAddressRequest(draft: AddressDraft, mainAddress = false): AddressRequest {
    const optional = (value: string) => value.trim() || null;
    return {
        label: optional(draft.label),
        street: draft.street.trim(),
        number: optional(draft.number),
        floor: optional(draft.floor),
        apartment: optional(draft.apartment),
        city: draft.city.trim(),
        state: optional(draft.state),
        postalCode: optional(draft.postalCode),
        mainAddress,
    };
}

/** Para mostrar un borrador todavía no guardado con el mismo formato que una dirección. */
export function draftToDisplayAddress(draft: AddressDraft) {
    const request = toAddressRequest(draft);
    return {
        label: request.label ?? undefined,
        street: request.street,
        number: request.number ?? undefined,
        floor: request.floor ?? undefined,
        apartment: request.apartment ?? undefined,
        city: request.city,
        state: request.state ?? undefined,
        postalCode: request.postalCode ?? undefined,
    };
}

type AddressFields = Pick<
    CustomerAddress,
    'label' | 'street' | 'number' | 'floor' | 'apartment' | 'city' | 'state' | 'postalCode'
>;

/** "Corrientes 1234, piso 3 B" */
export function formatStreetLine(address: AddressFields): string {
    const street = [address.street, address.number].filter(Boolean).join(' ');
    const unit = [
        address.floor ? `piso ${address.floor}` : null,
        address.apartment,
    ].filter(Boolean).join(' ');
    return unit ? `${street}, ${unit}` : street;
}

/** "CABA, Buenos Aires (C1042)" */
export function formatCityLine(address: AddressFields): string {
    const place = [address.city, address.state].filter(Boolean).join(', ');
    return address.postalCode ? `${place} (${address.postalCode})` : place;
}

/**
 * Cómo se muestra una dirección: con label, el label es el título y la dirección va
 * debajo; sin label, la calle es el título y la ciudad va debajo.
 */
export function getAddressDisplay(address: AddressFields): { title: string; lines: string[] } {
    const street = formatStreetLine(address);
    const city = formatCityLine(address);

    if (address.label) {
        return { title: address.label, lines: [street, city].filter(Boolean) };
    }
    return { title: street, lines: city ? [city] : [] };
}

/** En una sola cadena, para textos de una línea o celdas de detalle. */
export function formatAddress(address: AddressFields): string {
    return [formatStreetLine(address), formatCityLine(address)].filter(Boolean).join('\n');
}
