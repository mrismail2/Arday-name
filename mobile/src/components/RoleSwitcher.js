import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useRole } from '../context/RoleContext';
import { ROLES, ROLE_ORDER } from '../data/roles';
import { radius } from '../theme/colors';
import Avatar from './Avatar';

/* A compact pill that opens a role picker. Lets you preview the app
   as any of the 6 roles (Super Admin → Student). */
export default function RoleSwitcher() {
  const { c } = useTheme();
  const { role, profile, setRole } = useRole();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, { backgroundColor: c.blueSoft, borderColor: c.line2, borderWidth: 1 }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillTxt, { color: c.navy }]}>{profile.labelSo}</Text>
        <Text style={[styles.chev, { color: c.navy }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: c.surface }]}>
            <Text style={[styles.title, { color: c.ink }]}>Beddel Doorka (Role)</Text>
            {ROLE_ORDER.map((rk) => {
              const r = ROLES[rk];
              const active = rk === role;
              return (
                <TouchableOpacity
                  key={rk}
                  style={[styles.row, active && { backgroundColor: c.blueSoft }]}
                  onPress={() => { setRole(rk); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Avatar name={r.name} code={rk} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.rName, { color: c.ink }]}>{r.labelSo}</Text>
                    <Text style={[styles.rSub, { color: c.muted }]} numberOfLines={1}>{r.name}</Text>
                  </View>
                  {active && <Text style={{ color: c.blue, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  pillTxt: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  chev: { color: '#fff', fontSize: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,27,45,.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: radius.lg, padding: 16 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 4 },
  rName: { fontSize: 14.5, fontWeight: '700' },
  rSub: { fontSize: 12, marginTop: 1 },
});
