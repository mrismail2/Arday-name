/* ============================================================
   Kobciye — AppDataContext (the single store, in React)

   Loads the canonical store once (seeding/migrating on first launch) and
   exposes it to every screen with a reload() so mutations (add student,
   change status, save marks) reflect immediately. Screens read appData.*
   and pass it through dataSelectors — never raw arrays.
   ============================================================ */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initializeAppData, loadAppData } from '../services/appDataRepository';
import { emptyAppData } from '../utils/dataMigration';

const AppDataContext = createContext({ data: emptyAppData(), ready: false, reload: async () => {} });

export function AppDataProvider({ children }) {
  const [data, setData] = useState(emptyAppData());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const fresh = (await loadAppData()) || (await initializeAppData());
    setData(fresh);
    return fresh;
  }, []);

  useEffect(() => {
    let alive = true;
    initializeAppData().then((d) => { if (alive) { setData(d); setReady(true); } });
    return () => { alive = false; };
  }, []);

  return (
    <AppDataContext.Provider value={{ data, ready, reload }}>
      {children}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
