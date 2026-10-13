import { create } from 'zustand';

import { useOrderDraftStore } from '@/stores/order-draft-store';
import { Customer } from '@/types/customer';

/**
 * Lo único compartido entre pantallas de clientes. Los datos (listados, detalle,
 * direcciones) viven en los hooks de cada pantalla; acá solo hay:
 * - version: cambia con cada alta o modificación, para que los listados y detalles
 *   abiertos se recarguen sin depender de cuándo se vuelve a la pantalla.
 * - la sincronización del cliente del borrador de orden, que es una copia.
 *
 * Como no guarda clientes, no puede mostrar datos de otra empresa al cambiar de sesión.
 */
type CustomerState = {
    version: number;
    customersChanged: (updated?: Customer) => void;
};

export const useCustomerStore = create<CustomerState>((set) => ({
    version: 0,

    customersChanged: (updated) => {
        if (updated) {
            const draft = useOrderDraftStore.getState();
            if (draft.customer.id === updated.id) {
                draft.updateCustomer(updated);
            }
        }
        set((state) => ({ version: state.version + 1 }));
    },
}));
