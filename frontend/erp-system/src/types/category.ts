export type Category = {
    id: string;
    name: string;
    description?: string | null;
    companyId?: string | number | null;
    active: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type CategoryRequest = {
    name: string;
    description?: string | null;
};
