/* Schools owned/managed by the active admin. An admin can run several
   branches (e.g. Hidaaya Primary + Hidaaya Secondary), switch between
   them, and add new ones. Persisted via AsyncStorage. */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT = [
  { id: 'hidaayada', code: 'KOB-SCH-0042', name: 'Dugsiga Hidaayada', type: 'Primary School', city: 'Gabiley', students: 267, status: 'active' },
];

const SchoolContext = createContext({
  schools: DEFAULT, active: DEFAULT[0], setActive: () => {}, addSchool: () => {},
});
const KEY = 'kobciye_my_schools';

export function SchoolProvider({ children }) {
  const [schools, setSchools] = useState(DEFAULT);
  const [activeId, setActiveId] = useState(DEFAULT[0].id);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v) { try { const arr = JSON.parse(v); if (arr && arr.length) { setSchools(arr); setActiveId(arr[0].id); } } catch (e) {} }
    });
  }, []);

  const persist = (arr) => { setSchools(arr); AsyncStorage.setItem(KEY, JSON.stringify(arr)).catch(() => {}); };

  const addSchool = useCallback((s) => {
    setSchools((prev) => {
      const next = [...prev, s];
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setActiveId(s.id);
  }, []);

  const setActive = useCallback((id) => setActiveId(id), []);

  const active = schools.find((s) => s.id === activeId) || schools[0];

  return (
    <SchoolContext.Provider value={{ schools, active, setActive, addSchool }}>
      {children}
    </SchoolContext.Provider>
  );
}

export const useSchools = () => useContext(SchoolContext);
