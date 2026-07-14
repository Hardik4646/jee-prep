import { useState, useEffect, useRef, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      const parsed = JSON.parse(item);
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) return initialValue;
      return parsed as T;
    } catch {
      return initialValue;
    }
  });

  // Track whether we're in a suppressed-write state (after reset)
  const suppressNextWrite = useRef(false);

  // Synchronously persist on every state change, skipping suppressed writes
  useEffect(() => {
    if (suppressNextWrite.current) {
      suppressNextWrite.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Export and clear data to continue.');
      }
    }
  }, [key, storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
      return next;
    });
  }, []);

  const resetValue = useCallback(() => {
    suppressNextWrite.current = true;
    window.localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, resetValue];
}
