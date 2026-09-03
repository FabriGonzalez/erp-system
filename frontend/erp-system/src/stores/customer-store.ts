import { create } from 'zustand';

import { mockCustomers } from '@/data/mock-customers';
import { Customer, CustomerAddress, CUSTOMER_ANONYMOUS } from '@/types/customer';

type CustomerState = {
    customers: Customer[];
    searchQuery: string;
    isLoading: boolean;
    isError: boolean;
    errorMessage: string | null;

    setSearchQuery: (query: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: boolean, message?: string | null) => void;
    reloadCustomers: () => void;

    addCustomer: (customerData: Omit<Customer, 'id'>) => Customer;
    addCustomerAddress: (customerId: string, addressData: Omit<CustomerAddress, 'id'>) => CustomerAddress | null;
    getCustomerById: (id: string) => Customer | undefined;
};

export const useCustomerStore = create<CustomerState>((set, get) => ({
    customers: mockCustomers,
    searchQuery: '',
    isLoading: false,
    isError: false,
    errorMessage: null,

    setSearchQuery: (searchQuery) => {
        set({ searchQuery });
    },

    setLoading: (isLoading) => {
        set({ isLoading });
    },

    setError: (isError, errorMessage = null) => {
        set({
            isError,
            errorMessage,
        });
    },

    reloadCustomers: () => {
        set({
            isLoading: true,
            isError: false,
            errorMessage: null,
        });

        setTimeout(() => {
            set({
                isLoading: false,
            });
        }, 600);
    },

    addCustomer: (customerData) => {
        const id = `cust-${Date.now()}`;
        const newCustomer: Customer = {
            ...customerData,
            id,
            addresses: customerData.addresses.map((addr, index) => ({
                ...addr,
                id: addr.id || `addr-${Date.now()}-${index}`,
            })),
        };

        set((state) => ({
            customers: [newCustomer, ...state.customers],
        }));

        return newCustomer;
    },

    addCustomerAddress: (customerId, addressData) => {
        const customer = get().customers.find((c) => c.id === customerId);
        if (!customer) return null;

        const newAddress: CustomerAddress = {
            ...addressData,
            id: `addr-${Date.now()}`,
        };

        set((state) => ({
            customers: state.customers.map((c) =>
                c.id === customerId
                    ? {
                        ...c,
                        addresses: [...c.addresses, newAddress],
                    }
                    : c
            ),
        }));

        return newAddress;
    },

    getCustomerById: (id) => {
        if (id === CUSTOMER_ANONYMOUS.id) {
            return CUSTOMER_ANONYMOUS;
        }
        return get().customers.find((c) => c.id === id);
    },
}));
