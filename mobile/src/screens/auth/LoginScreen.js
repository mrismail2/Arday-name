import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { ROLES, ROLE_ORDER } from '../../data/roles';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

/* Frontend-only "login". Picking a role just swaps the preview profile and
   enters that role's dashboard — there is NO real authentication. */
export default function LoginScreen({ onAuthed, goRegister, goForgot }) {
  const { c } = useTheme();
  const { role, setRole } = useRole();
  const [picked, setPicked] = useState(role || 'schooladmin');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const login = () => {
    setRole(picked);     // set the preview profile/role
    onAuthed();          // enter the dashboard
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* brand */}
          <View style={styles.brand}>
            <Logo size={56} />
            <Text style={[styles.brandWord, { color: c.ink }]}>Kobciye</Text>
            <Text style={[styles.brandSub, { color: c.muted }]}>Soo gal akoonkaaga</Text>
          </View>

          {/* preview banner */}
          <View style={[styles.preview, { backgroundColor: c.goldSoft }]}>
            <Icon name="shield" size={15} color={c.gold700} />
            <Text style={[styles.previewTxt, { color: c.gold700 }]}>UI Preview Only — No Real Authentication Yet</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
            {/* email / phone */}
            <Text style={[styles.label, { color: c.muted }]}>EMAIL AMA TALEEFOON</Text>
            <View style={[styles.field, { backgroundColor: c.bg, borderColor: c.line }]}>
              <Icon name="mail" size={17} color={c.muted2} />
              <TextInput value={id} onChangeText={setId} placeholder="tusaale: admin@dugsi.edu"
                placeholderTextColor={c.muted2} autoCapitalize="none" style={[styles.input, { color: c.ink }]} />
            </View>

            {/* password */}
            <Text style={[styles.label, { color: c.muted }]}>FURAHA SIRTA</Text>
            <View style={[styles.field, { backgroundColor: c.bg, borderColor: c.line }]}>
              <Icon name="key" size={17} color={c.muted2} />
              <TextInput value={pw} onChangeText={setPw} placeholder="••••••••" secureTextEntry={!showPw}
                placeholderTextColor={c.muted2} style={[styles.input, { color: c.ink }]} />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                <Text style={[styles.showTxt, { color: c.blue }]}>{showPw ? 'Qari' : 'Tus'}</Text>
              </TouchableOpacity>
            </View>

            {/* role selector */}
            <Text style={[styles.label, { color: c.muted }]}>DOORKA (UI PREVIEW)</Text>
            <View style={styles.roles}>
              {ROLE_ORDER.map((k) => {
                const on = picked === k;
                return (
                  <TouchableOpacity key={k} onPress={() => setPicked(k)}
                    style={[styles.roleChip, { borderColor: on ? c.blue : c.line, backgroundColor: on ? c.blue : c.surface }]}>
                    <Text style={[styles.roleTxt, { color: on ? '#fff' : c.ink2 }]}>{ROLES[k].label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* login */}
            <TouchableOpacity style={[styles.loginBtn, { backgroundColor: c.navy }]} onPress={login} activeOpacity={0.9}>
              <Text style={styles.loginTxt}>Soo Gal · {ROLES[picked].label}</Text>
              <Icon name="chevronRight" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={goForgot} style={{ alignSelf: 'center', marginTop: 14 }}>
              <Text style={[styles.link, { color: c.blue }]}>Ma illowday furaha sirta?</Text>
            </TouchableOpacity>
          </View>

          {/* register */}
          <View style={styles.registerRow}>
            <Text style={[styles.regHint, { color: c.muted }]}>Dugsi cusub ma leedahay?</Text>
            <TouchableOpacity onPress={goRegister}>
              <Text style={[styles.link, { color: c.blue }]}>Diiwaan geli dugsi</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 30, paddingBottom: 40 },
  brand: { alignItems: 'center', marginBottom: 18 },
  brandWord: { fontSize: 26, fontWeight: '800', marginTop: 10, letterSpacing: -0.5 },
  brandSub: { fontSize: 13.5, fontWeight: '600', marginTop: 2 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, marginBottom: 16 },
  previewTxt: { fontSize: 11.5, fontWeight: '800', flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 7, marginTop: 14 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, fontSize: 14.5 },
  showTxt: { fontSize: 12.5, fontWeight: '700' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  roleTxt: { fontSize: 12.5, fontWeight: '700' },
  loginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: 14, marginTop: 22 },
  loginTxt: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  link: { fontSize: 13.5, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 },
  regHint: { fontSize: 13.5, fontWeight: '600' },
});
