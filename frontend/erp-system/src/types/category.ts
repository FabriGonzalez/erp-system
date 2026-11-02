export type Category = {
    id: string;
    name: string;
    description?: string | null;
    companyId?: string | number | null;
    active: boolean;
    // Los atributos que pueden usar las variantes de sus productos.
    attributeIds: string[];
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type CategoryRequest = {
    name: string;
    description?: string | null;
    attributeIds: string[];
};
