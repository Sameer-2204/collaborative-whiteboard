/* ──────────────────────────────────────────────────────────────
   src/hooks/useLocalStorage.js
   Generic hook for reading/writing a value in localStorage
   with React state synchronisation.

   Usage:
     const [theme, setTheme] = useLocalStorage('theme', 'dark');

   TODO (Phase 2): use for persisting user preferences.
   ────────────────────────────────────────────────────────────── */

import { useState } from 'react';

function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore =
                value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (err) {
            console.error(`useLocalStorage[${key}]:`, err);
        }
    };

    return [storedValue, setValue];
}

export default useLocalStorage;
