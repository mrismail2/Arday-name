/* Theme provider — the app is light-only (the dark-mode toggle was removed
   from Settings per product decision). `isDark`/`toggle` stay in the
   context shape so any existing consumer keeps working; toggle is a no-op. */
import React, { createContext, useContext } from 'react';
import { light } from './colors';

const ThemeContext = createContext({ c: light, isDark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const value = { c: light, isDark: false, toggle: () => {} };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
