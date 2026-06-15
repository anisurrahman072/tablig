import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Href } from 'expo-router';

const FAB_POSITION_KEY = 'fab_position_v1';

export type FabPosition = {
  x: number;
  y: number;
};

type FabContextValue = {
  position: FabPosition | null;
  positionLoaded: boolean;
  setPosition: (position: FabPosition) => void;
  setReturnPath: (path: Href) => void;
  consumeReturnPath: () => Href | null;
};

const FabContext = createContext<FabContextValue | null>(null);

export function FabProvider({ children }: { children: React.ReactNode }) {
  const [position, setPositionState] = useState<FabPosition | null>(null);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [returnPath, setReturnPathState] = useState<Href | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(FAB_POSITION_KEY);
        if (cancelled) return;
        if (stored) {
          const parsed = JSON.parse(stored) as FabPosition;
          if (
            typeof parsed.x === 'number' &&
            typeof parsed.y === 'number' &&
            Number.isFinite(parsed.x) &&
            Number.isFinite(parsed.y)
          ) {
            setPositionState(parsed);
          }
        }
      } catch {
        // Ignore corrupt storage and fall back to default placement.
      } finally {
        if (!cancelled) setPositionLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setPosition = useCallback((next: FabPosition) => {
    setPositionState(next);
    SecureStore.setItemAsync(FAB_POSITION_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setReturnPath = useCallback((path: Href) => {
    setReturnPathState(path);
  }, []);

  const consumeReturnPath = useCallback(() => {
    const path = returnPath;
    setReturnPathState(null);
    return path;
  }, [returnPath]);

  const value = useMemo(
    () => ({
      position,
      positionLoaded,
      setPosition,
      setReturnPath,
      consumeReturnPath,
    }),
    [position, positionLoaded, setPosition, setReturnPath, consumeReturnPath]
  );

  return <FabContext.Provider value={value}>{children}</FabContext.Provider>;
}

export function useFab() {
  const ctx = useContext(FabContext);
  if (!ctx) throw new Error('useFab must be used within FabProvider');
  return ctx;
}
