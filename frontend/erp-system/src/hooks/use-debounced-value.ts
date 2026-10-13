import { useEffect, useState } from 'react';

/** Devuelve el valor recién cuando dejó de cambiar durante delayMs (p. ej. al tipear). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}
