/** UserResponse del backend (/api/v1/users). */
export type UserResponse = {
    id: number | string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId?: number | string | null;
    roleName: string | null;
    companyId?: number | string | null;
    companyName?: string | null;
    active: boolean;
    createdAt?: string | null;
};

/** Usuario de la empresa, tal como lo administra un usuario con ADMINISTRAR_USUARIOS. */
export type CompanyUser = {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    roleId: string | null;
    roleName: string;
    active: boolean;
};

export type CreateUserRequest = {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
};

export type UpdateUserRequest = Omit<CreateUserRequest, 'password'>;
