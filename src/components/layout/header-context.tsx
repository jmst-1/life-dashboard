'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type HeaderState = {
  title: string;
  backHref?: string | null;
  backLabel?: string | null;
  rightSlot?: ReactNode;
};

type HeaderContextValue = {
  header: HeaderState;
  setHeader: (next: HeaderState) => void;
};

const HeaderContext = createContext<HeaderContextValue | null>(null);

const EMPTY: HeaderState = { title: '' };

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<HeaderState>(EMPTY);

  const setHeader = useCallback((next: HeaderState) => {
    setHeaderState(next);
  }, []);

  const value = useMemo(
    () => ({ header, setHeader }),
    [header, setHeader]
  );

  return (
    <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
  );
}

export function useHeader(): HeaderContextValue {
  const ctx = useContext(HeaderContext);
  if (!ctx) {
    throw new Error('useHeader must be used within HeaderProvider');
  }
  return ctx;
}

/** Sets the persistent header for the current screen; clears on unmount. */
export function useSetHeader(state: HeaderState) {
  const { setHeader } = useHeader();
  const { title, backHref, backLabel } = state;

  useEffect(() => {
    setHeader({ title, backHref: backHref ?? null, backLabel: backLabel ?? null });
    return () => setHeader(EMPTY);
  }, [setHeader, title, backHref, backLabel]);
}

/** Client helper for server pages that only need to set title/back. */
export function SetHeader({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  useSetHeader({ title, backHref, backLabel });
  return null;
}
