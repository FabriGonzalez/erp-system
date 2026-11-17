export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

// GET /api/v1/provisioning/companies y PATCH .../status
export type Company = {
    id: number;
    name: string;
    legalName: string | null;
    taxId: string | null;
    status: CompanyStatus;
    statusReason: string | null;
    statusChangedAt: string | null;
    createdAt: string;
};

// POST /api/v1/auth/login (solo los campos que usa el panel)
export type LoginResponse = {
    token: string;
    username: string;
    platformAdmin: boolean;
};

// POST /api/v1/provisioning/companies
export type ProvisionCompanyRequest = {
    companyName: string;
    legalName?: string;
    taxId?: string;
    adminUsername: string;
    adminEmail: string;
    adminFirstName?: string;
    adminLastName?: string;
};

export type ProvisionCompanyResponse = {
    companyId: number;
    companyName: string;
    legalName: string | null;
    taxId: string | null;
    adminUserId: number;
    adminUsername: string;
    adminEmail: string;
    temporaryPassword: string;
};

export type Session = {
    token: string;
    username: string;
};
