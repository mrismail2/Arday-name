import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useRole } from '../context/RoleContext';
import RoleSwitcher from '../components/RoleSwitcher';
import NotificationBell from '../components/NotificationBell';
import SchoolHero from '../components/SchoolHero';
import { DASH_BY_ROLE } from './dashboards/RoleDashboards';

/* Role-aware dashboard: a clean greeting row + the school identity banner
   stay on top, the body swaps to the active role's cards. */
export default function DashboardScreen() {
  const { c } = useTheme();
  const { role, profile } = useRole();
  const Body = DASH_BY_ROLE[role] || DASH_BY_ROLE.schooladmin;

  // Super Admin oversees the whole platform; everyone else uses their active
  // school branch (SchoolHero pulls it from SchoolContext when not forced).
  const platform = { name: 'Kobciye Platform', type: 'School Management SaaS', city: '42 Dugsi', students: null };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* greeting row */}
        <View style={styles.greet}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.hi, { color: c.muted }]}>Asalaamu calaykum 👋</Text>
            <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{profile.name}</Text>
          </View>
          <View style={styles.actions}>
            <NotificationBell />
            <RoleSwitcher />
          </View>
        </View>

        {/* school identity banner */}
        <SchoolHero school={role === 'superadmin' ? platform : undefined} />

        <Body />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  greet: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hi: { fontSize: 13, fontWeight: '600' },
  name: { fontSize: 21, fontWeight: '800', marginTop: 2 },
});

