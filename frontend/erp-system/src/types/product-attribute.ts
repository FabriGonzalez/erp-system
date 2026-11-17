export type ProductAttribute = {
    id: string;
    name: string;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductAttributeRequest = {
    name: string;
};

export type ProductAttributeResponse = {
    id: number | string;
    name: string;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

/** Muestra de color de un valor: colores #RRGGBB en orden, el primero es el primario. */
export type ColorSwatch = {
    colors: string[];
};

export type ProductAttributeValue = {
    id: string;
    attributeId: string;
    attributeName?: string;
    name: string;
    swatch: ColorSwatch | null;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type ProductAttributeValueRequest = {
    value: string;
    /** null la borra: al editar hay que mandar siempre la muestra actual. */
    swatch: ColorSwatch | null;
};

export type ProductAttributeValueResponse = {
    id: number | string;
    attributeId: number | string;
    attributeName: string;
    value: string;
    swatch?: ColorSwatch | null;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};
