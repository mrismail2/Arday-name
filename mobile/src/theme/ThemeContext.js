/* Theme provider — light/dark, persisted with AsyncStorage.
   Mirrors the web app's data-theme toggle. */
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from './colors';

const ThemeContext = createContext({ c: light, isDark: false, toggle: () => {} });

const KEY = 'kobciye_theme';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'dark') setIsDark(true);
    });
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  const value = { c: isDark ? dark : light, isDark, toggle };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
