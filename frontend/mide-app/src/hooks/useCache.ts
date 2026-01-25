// hooks/useCache.ts
import { useState, useCallback, useRef } from 'react';

interface Cache<T> {
  [key: string]: {
    data: T;
    timestamp: number;
  };
}

export function useCache<T>(ttl: number = 5 * 60 * 1000) { 
  const [cache, setCache] = useState<Cache<T>>({});
  const cacheRef = useRef(cache);
  
  const get = useCallback((key: string): T | null => {
    const item = cacheRef.current[key];
    if (!item) return null;
    
    // Проверяем срок годности
    if (Date.now() - item.timestamp > ttl) {
      delete cacheRef.current[key];
      setCache({...cacheRef.current});
      return null;
    }
    
    return item.data;
  }, [ttl]);
  
  const set = useCallback((key: string, data: T) => {
    cacheRef.current[key] = {
      data,
      timestamp: Date.now()
    };
    setCache({...cacheRef.current});
  }, []);
  
  const remove = useCallback((key: string) => {
    delete cacheRef.current[key];
    setCache({...cacheRef.current});
  }, []);
  
  const clear = useCallback(() => {
    cacheRef.current = {};
    setCache({});
  }, []);
  
  return { get, set, remove, clear };
}