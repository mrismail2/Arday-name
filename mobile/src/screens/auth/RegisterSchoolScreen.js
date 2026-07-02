import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme/ThemeContext';
import { usePhotos } from '../../context/PhotoContext';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

const TYPES = ['Primary School', 'Secondary School', 'Mixed'];
const PLANS = [
  { key: 'small', name: 'Small School', rate: 0.07, hint: '$0.07 / arday firfircoon' },
  { key: 'large', name: 'Large School', rate: 0.10, hint: '$0.10 / arday firfircoon' },
];
const REG_KEY = 'kobciye_school_registrations';

/* Frontend-only school registration. Saves a mock record to AsyncStorage and
   shows a "submitted for approval" message — no backend/approval logic. */
export default function RegisterSchoolScreen({ goLogin }) {
  const { c } = useTheme();
  const { photos, pickPhoto } = usePhotos();
  const logoKey = 'register_school_logo';

  const [f, setF] = useState({ name: '', type: 'Primary School', city: '', phone: '', email: '', admin: '', students: '', plan: 'small', password: '' });
  const [done, setDone] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) return;
    const rec = {
      ...f,
      id: 'reg_' + Date.now(),
      logo: photos[logoKey] || null,
      status: 'pending_approval',
      submitted_at: new Date().toISOString(),
    };
    try {
      const raw = await AsyncStorage.getItem(REG_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(rec);
      await AsyncStorage.setItem(REG_KEY, JSON.stringify(arr));
    } catch (e) { /* preview-only: ignore storage errors */ }
    setDone(true);
  };

  const plan = PLANS.find((p) => p.key === f.plan);
  const est = parseInt(f.students, 10) || 0;
  const monthly = est ? (est * plan.rate).toFixed(2) : null;

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.okCircle, { backgroundColor: c.greenSoft }]}>
            <Icon name="check" size={32} color={c.green} strokeWidth={2.5} />
          </View>
          <Text style={[styles.okTitle, { color: c.ink }]}>School registration submitted for approval.</Text>
          <Text style={[styles.okSub, { color: c.muted }]}>
            {f.name} — {plan.name}. Codsigaaga waa la keydiyay (UI preview). Maamulka ayaa eegi doona.
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: c.navy, marginTop: 24 }]} onPress={goLogin} activeOpacity={0.9}>
            <Text style={styles.btnTxt}>Ku noqo Soo-gal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={goLogin} hitSlop={10} style={[styles.back, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="back" size={20} color={c.ink} />
          </TouchableOpacity>

          <View style={styles.brand}>
            <Logo size={48} />
            <Text style={[styles.title, { color: c.ink }]}>Diiwaan geli Dugsigaaga</Text>
            <Text style={[styles.sub, { color: c.muted }]}>Buuxi xogta dugsiga si aad u bilowdo.</Text>
          </View>

          {/* logo upload preview */}
          <View style={styles.logoRow}>
            <TouchableOpacity onPress={() => pickPhoto(logoKey)} style={[styles.logoBox, { borderColor: c.line, backgroundColor: c.surface }]}>
              {photos[logoKey] ? (
                <Icon name="check" size={22} color={c.green} />
              ) : (
                <Icon name="camera" size={22} color={c.muted2} />
              )}
            </TouchableOpacity>
            <Text style={[styles.logoHint, { color: c.muted }]}>{photos[logoKey] ? 'Logo waa la doortay' : 'Riix si aad logo u gelis (preview)'}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Field c={c} label="MAGACA DUGSIGA" value={f.name} onChangeText={(v) => set('name', v)} placeholder="tusaale: Dugsiga Hidaayada" />

            <Text style={[styles.label, { color: c.muted }]}>NOOCA DUGSIGA</Text>
            <View style={styles.seg}>
              {TYPES.map((t) => {
                const on = f.type === t;
                return (
                  <TouchableOpacity key={t} onPress={() => set('type', t)} style={[styles.segBtn, { borderColor: on ? c.blue : c.line, backgroundColor: on ? c.blueSoft : c.surface }]}>
                    <Text style={[styles.segTxt, { color: on ? c.navy : c.muted }]}>{t.replace(' School', '')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field c={c} label="MAGAALADA" value={f.city} onChangeText={(v) => set('city', v)} placeholder="tusaale: Gabiley" />
            <Field c={c} label="TALEEFOON" value={f.phone} onChangeText={(v) => set('phone', v)} placeholder="+252 …" keyboardType="phone-pad" />
            <Field c={c} label="EMAIL" value={f.email} onChangeText={(v) => set('email', v)} placeholder="info@dugsi.edu" keyboardType="email-address" />
            <Field c={c} label="MAGACA MAAMULAHA DUGSIGA" value={f.admin} onChangeText={(v) => set('admin', v)} placeholder="Magaca buuxa" />
            <Field c={c} label="TIRADA ARDAYDA (QIYAAS)" value={f.students} onChangeText={(v) => set('students', v)} placeholder="tusaale: 300" keyboardType="number-pad" />

            {/* plan selection */}
            <Text style={[styles.label, { color: c.muted }]}>QORSHAHA</Text>
            {PLANS.map((p) => {
              const on = f.plan === p.key;
              return (
                <TouchableOpacity key={p.key} onPress={() => set('plan', p.key)}
                  style={[styles.planRow, { borderColor: on ? c.blue : c.line, backgroundColor: on ? c.blueSoft : c.surface }]}>
                  <View style={[styles.radio, { borderColor: on ? c.blue : c.muted2 }]}>{on ? <View style={[styles.radioDot, { backgroundColor: c.blue }]} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: c.ink }]}>{p.name}</Text>
                    <Text style={[styles.planHint, { color: c.muted }]}>{p.hint}</Text>
                  </View>
                  <Text style={[styles.planRate, { color: c.navy }]}>${p.rate.toFixed(2)}</Text>
                </TouchableOpacity>
              );
            })}
            {monthly ? (
              <Text style={[styles.estimate, { color: c.muted }]}>Qiyaas bishii: {est} arday × ${plan.rate.toFixed(2)} = <Text style={{ color: c.green, fontWeight: '800' }}>${monthly}</Text></Text>
            ) : null}

            <Field c={c} label="FURAHA SIRTA" value={f.password} onChangeText={(v) => set('password', v)} placeholder="••••••••" secureTextEntry />

            <TouchableOpacity style={[styles.btn, { backgroundColor: c.navy, marginTop: 18 }]} onPress={submit} activeOpacity={0.9}>
              <Text style={styles.btnTxt}>Gudbi Codsiga Diiwaangelinta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ c, label, ...props }) {
  return (
    <>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={[styles.field, { backgroundColor: c.bg, borderColor: c.line }]}>
        <TextInput placeholderTextColor={c.muted2} style={[styles.input, { color: c.ink }]} {...props} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 18, paddingBottom: 40 },
  back: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brand: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginTop: 10 },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  logoBox: { width: 60, height: 60, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  logoHint: { fontSize: 12.5, fontWeight: '600', flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 7, marginTop: 13 },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14 },
  seg: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segTxt: { fontSize: 12.5, fontWeight: '700' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planName: { fontSize: 14, fontWeight: '700' },
  planHint: { fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  planRate: { fontSize: 16, fontWeight: '800' },
  estimate: { fontSize: 12.5, fontWeight: '600', marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  okCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  okTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  okSub: { fontSize: 13.5, fontWeight: '600', marginTop: 8, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
