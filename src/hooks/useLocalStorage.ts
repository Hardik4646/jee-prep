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

  const suppressNextWrite = useRef(false);

  useEffect(() => {
    if (suppressNextWrite.current) {
      suppressNextWrite.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`LocalStorage quota reached while saving key "${key}". Use Settings -> Export Backup.`);
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
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, resetValue];
}
