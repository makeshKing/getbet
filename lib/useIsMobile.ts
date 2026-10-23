import { useEffect, useState } from 'react';

/**
 * Responsive helper: true when the viewport is narrower than 768px (Tailwind's `md`).
 * Use it where a component is built with inline `style` objects that Tailwind
 * breakpoints can't reach (e.g. MarketOutcomeList's fixed-width rows / MarketDetail chart).
 *
 * Defaults to `false` on the first render (desktop) and corrects after mount to
 * avoid SSR/first-paint mismatch; fine here since this is a client-only Vite app.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
