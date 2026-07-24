'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration can fail on insecure origins other than localhost — ignore.
    });
  }, []);

  return null;
}
