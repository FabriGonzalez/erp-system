import { useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';

type FetchResult = {
    key: string;
    error: string | null;
};

export function useOrderDetail(id: string | undefined) {
    const token = useAuthStore((state) => state.token);
    const order = useOrderStore((state) =>
        state.orders.find((item) => item.id === id)
    );
    const fetchOrderById = useOrderStore((state) => state.fetchOrderById);
    const [result, setResult] = useState<FetchResult | null>(null);

    const key = id && token ? `${id}:${token}` : null;

    useEffect(() => {
        if (!id || !token || !key) {
            return;
        }

        let isCurrent = true;

        fetchOrderById(id, token)
            .then(() => {
                if (isCurrent) setResult({ key, error: null });
            })
            .catch((error) => {
                if (isCurrent) {
                    setResult({
                        key,
                        error:
                            error instanceof Error
                                ? error.message
                                : 'No se pudo cargar la orden.',
                    });
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [id, token, key, fetchOrderById]);

    const isSettled = key === null || result?.key === key;

    return {
        order,
        isLoading: !isSettled,
        loadError: isSettled ? (result?.error ?? null) : null,
    };
}
