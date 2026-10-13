import { useCallback, useEffect, useRef, useState } from 'react';

type QueryResult<T> = {
    baseKey: string;
    fullKey: string;
    data: T | null;
    error: string | null;
    // Status HTTP si el error lo trae (p. ej. CustomerServiceError), para detectar un 404.
    errorStatus: number | null;
};

function statusOf(error: unknown): number | null {
    if (typeof error === 'object' && error !== null && 'status' in error) {
        const status = (error as { status: unknown }).status;
        return typeof status === 'number' ? status : null;
    }
    return null;
}

/**
 * Carga datos identificados por una clave (sesión, entidad, parámetros).
 *
 * - Solo se aplica la respuesta de la clave vigente: una respuesta vieja nunca pisa
 *   una más nueva ni datos de otra entidad.
 * - isLoading se deriva de la clave, sin setState síncrono dentro del efecto.
 * - Al recargar la misma clave se siguen mostrando los datos anteriores hasta que
 *   llegan los nuevos; al cambiar de clave no se muestran datos de la anterior.
 *
 * key null = no consultar (p. ej. sin sesión o sin id). refreshKey fuerza una recarga
 * de la misma entidad (p. ej. la versión de clientes) sin vaciar lo que se muestra.
 */
export function useKeyedQuery<T>(
    key: string | null,
    fetcher: () => Promise<T>,
    fallbackError: string,
    refreshKey: string | number = 0,
) {
    const [reloadCount, setReloadCount] = useState(0);
    const [result, setResult] = useState<QueryResult<T> | null>(null);
    const fullKey = key === null ? null : `${key}#${refreshKey}#${reloadCount}`;

    // El fetcher cambia en cada render; la consulta depende solo de la clave.
    const fetcherRef = useRef(fetcher);
    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        if (key === null || fullKey === null) {
            return;
        }

        let isCurrent = true;

        fetcherRef.current()
            .then((data) => {
                if (isCurrent) setResult({ baseKey: key, fullKey, data, error: null, errorStatus: null });
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setResult({
                        baseKey: key,
                        fullKey,
                        data: null,
                        error: error instanceof Error ? error.message : fallbackError,
                        errorStatus: statusOf(error),
                    });
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [key, fullKey, fallbackError]);

    const reload = useCallback(() => setReloadCount((count) => count + 1), []);
    const isSameEntity = result !== null && result.baseKey === key;
    const isCurrentLoad = isSameEntity && result.fullKey === fullKey;

    return {
        data: isSameEntity ? result.data : null,
        error: isCurrentLoad ? result.error : null,
        notFound: isCurrentLoad && result.errorStatus === 404,
        isLoading: key !== null && result?.fullKey !== fullKey,
        reload,
    };
}
