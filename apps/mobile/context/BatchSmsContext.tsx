import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DirectoryEntry } from '../lib/directory';

type BatchSmsContextValue = {
  selected: DirectoryEntry[];
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (entry: DirectoryEntry) => void;
  add: (entry: DirectoryEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
};

const BatchSmsContext = createContext<BatchSmsContextValue | null>(null);

export function BatchSmsProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<Map<string, DirectoryEntry>>(new Map());

  const toggle = useCallback((entry: DirectoryEntry) => {
    if (!entry.mobile) return;
    setMap((prev) => {
      const next = new Map(prev);
      if (next.has(entry._id)) {
        next.delete(entry._id);
      } else {
        next.set(entry._id, entry);
      }
      return next;
    });
  }, []);

  const add = useCallback((entry: DirectoryEntry) => {
    if (!entry.mobile) return;
    setMap((prev) => {
      const next = new Map(prev);
      next.set(entry._id, entry);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setMap(new Map()), []);

  const value = useMemo<BatchSmsContextValue>(() => {
    const selected = Array.from(map.values());
    return {
      selected,
      selectedIds: new Set(map.keys()),
      isSelected: (id: string) => map.has(id),
      toggle,
      add,
      remove,
      clear,
      count: map.size,
    };
  }, [map, toggle, add, remove, clear]);

  return <BatchSmsContext.Provider value={value}>{children}</BatchSmsContext.Provider>;
}

export function useBatchSmsSelection() {
  const ctx = useContext(BatchSmsContext);
  if (!ctx) {
    throw new Error('useBatchSmsSelection must be used within BatchSmsProvider');
  }
  return ctx;
}

export function useBatchSmsSelectionOptional() {
  return useContext(BatchSmsContext);
}
