export type Branch = {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    companyId?: string | number | null;
    active?: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
};

export type BranchRequest = {
    name: string;
    address?: string | null;
    phone?: string | null;
};