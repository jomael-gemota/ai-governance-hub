import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'agh-theme-mode';

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || 'system';
  });
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, resolvedTheme]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      toggleTheme: () => setMode(resolvedTheme === 'dark' ? 'light' : 'dark'),
      useSystemTheme: () => setMode('system'),
    }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

