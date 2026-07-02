/* Current-role provider. Switching role changes the dashboard, the visible
   tabs and the data scope. For the Teacher, the School-Admin-granted
   permissions (persisted in AsyncStorage) are merged into the profile and
   used to filter the teacher's navigation — so toggling a permission updates
   the teacher's UI immediately and survives an app restart. */
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROLES } from '../data/roles';
import { setCurrentProfile } from '../data/access';
import { getTeacherPermissions, saveTeacherPermissions, DEFAULT_TEACHER_PERMISSIONS } from '../services/permissionStorage';

const KEY = 'kobciye_role';
export const TEACHER_ID = 'teacher';

/* nav item -> permission required for the Teacher to see it. Items not listed
   are always visible (dashboard, classes, lessons, settings). */
const NAV_PERMISSION = {
  attendance: 'attendance_view',
  exams: 'results_view',
  incidents: 'incidents_view',
  messages: 'messages_send',
  reports: 'class_reports_view',
};

function teacherNav(perms) {
  return ROLES.teacher.nav.filter((k) => {
    const need = NAV_PERMISSION[k];
    return !need || perms[need] === true;
  });
}

const RoleContext = createContext({
  role: 'schooladmin', profile: ROLES.schooladmin, setRole: () => {},
  teacherPerms: DEFAULT_TEACHER_PERMISSIONS, setTeacherPermission: () => {},
});

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState('schooladmin');
  const [teacherPerms, setTeacherPerms] = useState(DEFAULT_TEACHER_PERMISSIONS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v && ROLES[v]) setRoleState(v); });
    getTeacherPermissions(TEACHER_ID).then(setTeacherPerms);
  }, []);

  const setRole = (r) => {
    if (!ROLES[r]) return;
    setRoleState(r);
    AsyncStorage.setItem(KEY, r).catch(() => {});
  };

  // School Admin toggles one teacher permission — persist + update live state
  const setTeacherPermission = (permKey, enabled) => {
    setTeacherPerms((prev) => {
      const next = { ...prev, [permKey]: !!enabled };
      saveTeacherPermissions(TEACHER_ID, next).catch(() => {});
      return next;
    });
  };

  // the active profile; the Teacher gets merged permissions + filtered nav
  const profile = useMemo(() => {
    const base = ROLES[role];
    if (role === 'teacher') {
      return { ...base, permissions: teacherPerms, nav: teacherNav(teacherPerms) };
    }
    return base;
  }, [role, teacherPerms]);

  // register the active profile so non-React modules (access.js) can read it
  useEffect(() => { setCurrentProfile(profile); }, [profile]);

  return (
    <RoleContext.Provider value={{ role, profile, setRole, teacherPerms, setTeacherPermission }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
