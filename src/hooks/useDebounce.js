import { useState, useEffect } from 'react';

/**
 * Hook para debouncing de valores.
 * @param value Valor a ser debouncado
 * @param delay Atraso em milisegundos (default: 500)
 */
export const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};
