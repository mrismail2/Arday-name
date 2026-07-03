import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { shadow } from '../theme/colors';
import { useLessons } from '../context/LessonsContext';
import { useAppData } from '../context/AppDataContext';
import { studentDetail } from '../data/mock';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import StudentProfileModal from '../components/StudentProfileModal';

/* The school this review code (WAS-HID-…) is scoped to. Phase 3: resolved
   from the school's own ministry-code record instead of a constant. */
const REVIEW_SCHOOL_ID = 'school_001';

/* Ministry (Wasaarad) review portal — reached from the landing page, gated
   by the school's review code. The ministry is NOT a logged-in user, and
   sees EXACTLY four things about the school and nothing else:
     1. total student count
     2. active teacher count
     3. parents' mobile numbers
     4. student profiles (same website UI, read-only) + attendance
   No exams, finance, incidents, messages, or settings are reachable here. */
export default function MinistryReviewScreen({ onBack }) {
  const { c } = useTheme();
  const { reviewCode } = useLessons();
  const { data } = useAppData();
  const [code, setCode] = useState('');
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('ardayda'); // ardayda | xaadiriska | waalidka
  const [detail, setDetail] = useState(null);

  const school = useMemo(
    () => (data.schools || []).find((s) => s.school_id === REVIEW_SCHOOL_ID) || { name: 'Dugsiga' },
    [data.schools]
  );
  const students = useMemo(
    () => (data.students || []).filter((s) => s.school_id === REVIEW_SCHOOL_ID && s.status === 'active'),
    [data.students]
  );
  const teachers = useMemo(
    () => (data.teacher_permissions || []).filter((t) => t.school_id === REVIEW_SCHOOL_ID),
    [data.teacher_permissions]
  );
  const classNameById = useMemo(() => {
    const m = new Map();
    (data.classes || []).forEach((cl) => m.set(cl.class_id, cl.name));
    return m;
  }, [data.classes]);

  // one row per parent (grouped by name+phone), with their children listed
  const parents = useMemo(() => {
    const seen = new Map();
    students.forEach((s) => {
      const d = studentDetail(s.name, s.student_id, s);
      const key = d.parent + '|' + d.phone;
      if (!seen.has(key)) seen.set(key, { name: d.parent, phone: d.phone, children: [] });
      seen.get(key).children.push(s.name);
    });
    return [...seen.values()];
  }, [students]);

  const avgAtt = students.length
    ? Math.round(students.reduce((sum, s) => sum + (s.att || 0), 0) / students.length)
    : 0;

  const submit = () => {
    if (code.trim().toUpperCase() === reviewCode.toUpperCase()) { setGranted(true); setError(''); }
    else setError('Lambarka eegista waa qaldan yahay. Isku day mar kale.');
  };

  // ---- gate: enter the review code ----
  if (!granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {/* ministry banner */}
          <View style={styles.banner}>
            <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#0A2E6B" />
                  <Stop offset="1" stopColor="#0F1B2D" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#bannerGrad)" />
              <Circle cx="-20" cy="20" r="90" fill="#13458F" opacity={0.35} />
              <Circle cx="380" cy="-30" r="110" fill="#CFAD5E" opacity={0.12} />
            </Svg>

            <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.backLink}>
              <Icon name="back" size={18} color="#fff" />
              <Text style={styles.backTxt}>Ku noqo</Text>
            </TouchableOpacity>

            <View style={styles.emblemRing}>
              <Icon name="shield" size={28} color="#fff" />
            </View>
            <Text style={styles.ministryName}>Wasaaradda Waxbarashada{'\n'}iyo Sayniska</Text>
          </View>

          {/* floating code-entry card */}
          <View style={styles.gateWrap}>
            <View style={[styles.gateCard, shadow.card, { backgroundColor: c.surface, borderColor: c.line }]}>
              <View style={[styles.gateIcon, { backgroundColor: c.greenSoft }]}>
                <Icon name="shield" size={28} color={c.green} />
              </View>
              <Text style={[styles.gateTitle, { color: c.ink }]}>Eegista Wasaaradda</Text>
              <Text style={[styles.gateSub, { color: c.muted }]}>
                Geli lambarka eegista ee dugsigu ku siiyay si aad u aragto xogta guud ee dugsiga.
              </Text>

              <TextInput
                value={code} onChangeText={(t) => { setCode(t); setError(''); }}
                autoCapitalize="characters" placeholder="WAS-XXXX-XXXX" placeholderTextColor={c.muted2}
                style={[styles.codeInput, { backgroundColor: c.bg, borderColor: error ? c.rose : c.line, color: c.ink }]}
              />
              {error ? <Text style={[styles.errTxt, { color: c.rose }]}>{error}</Text> : null}

              <TouchableOpacity style={[styles.gateBtn, { backgroundColor: c.navy }]} onPress={submit} activeOpacity={0.85}>
                <Icon name="shield" size={16} color="#fff" />
                <Text style={styles.gateBtnTxt}>Gal Eegista</Text>
              </TouchableOpacity>

              <View style={[styles.gateFootRow, { borderTopColor: c.line }]}>
                <Icon name="shield" size={12} color={c.muted2} />
                <Text style={[styles.gateFootTxt, { color: c.muted2 }]}>Daawasho keliya — xogtu waa la ilaaliyaa</Text>
              </View>
            </View>

            <Text style={[styles.poweredBy, { color: c.muted2 }]}>Powered by Kobciye</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- portal: read-only school overview (ONLY these four things) ----
  const TabBtn = ({ id, label }) => (
    <TouchableOpacity
      onPress={() => setTab(id)}
      style={[styles.tabBtn, tab === id && { backgroundColor: c.navy }]}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabTxt, { color: tab === id ? '#fff' : c.muted }]}>{label}</Text>
    </TouchableOpacity>
  );

  const attTone = (v) => (v >= 90 ? 'green' : v >= 75 ? 'gold' : 'rose');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: c.line }]}>
        <TouchableOpacity onPress={onBack} hitSlop={10} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Icon name="back" size={20} color={c.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.hTitle, { color: c.ink }]}>{school.name}</Text>
          <Text style={[styles.hSub, { color: c.muted }]}>Eegista Wasaaradda · daawasho keliya</Text>
        </View>
        <Badge label={reviewCode} tone="green" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {/* ---- the only stats the ministry may see ---- */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={[styles.statIcon, { backgroundColor: c.blueSoft }]}><Icon name="students" size={17} color={c.blue} /></View>
            <Text style={[styles.statN, { color: c.ink }]}>{students.length}</Text>
            <Text style={[styles.statLbl, { color: c.muted }]}>Tirada Ardayda</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={[styles.statIcon, { backgroundColor: c.goldSoft }]}><Icon name="teachers" size={17} color={c.gold700} /></View>
            <Text style={[styles.statN, { color: c.ink }]}>{teachers.length}</Text>
            <Text style={[styles.statLbl, { color: c.muted }]}>Macalimiin Hawlgal ah</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={[styles.statIcon, { backgroundColor: c.greenSoft }]}><Icon name="attendance" size={17} color={c.green} /></View>
            <Text style={[styles.statN, { color: c.ink }]}>{avgAtt}%</Text>
            <Text style={[styles.statLbl, { color: c.muted }]}>Xaadiriska Guud</Text>
          </View>
        </View>

        {/* ---- section switcher ---- */}
        <View style={[styles.tabs, { backgroundColor: c.surface, borderColor: c.line }]}>
          <TabBtn id="ardayda" label="Ardayda" />
          <TabBtn id="xaadiriska" label="Xaadiriska" />
          <TabBtn id="waalidka" label="Waalidka" />
        </View>

        {/* ---- Ardayda: profiles (same website UI — tap opens the profile) ---- */}
        {tab === 'ardayda' && students.map((s) => (
          <TouchableOpacity
            key={s.student_internal_id}
            style={[styles.rowCard, { backgroundColor: c.surface, borderColor: c.line }]}
            activeOpacity={0.85}
            onPress={() => setDetail(s)}
          >
            <Avatar name={s.name} code={s.student_internal_id} size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowName, { color: c.ink }]}>{s.name}</Text>
              <Text style={[styles.rowMeta, { color: c.muted }]}>{s.student_id} · {classNameById.get(s.class_id) || '—'}</Text>
            </View>
            <Icon name="chevronRight" size={16} color={c.muted} />
          </TouchableOpacity>
        ))}

        {/* ---- Xaadiriska: per-student attendance ---- */}
        {tab === 'xaadiriska' && students.map((s) => (
          <View key={s.student_internal_id} style={[styles.rowCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Avatar name={s.name} code={s.student_internal_id} size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowName, { color: c.ink }]}>{s.name}</Text>
              <Text style={[styles.rowMeta, { color: c.muted }]}>{classNameById.get(s.class_id) || '—'}</Text>
            </View>
            <Badge label={`${s.att != null ? s.att : '—'}%`} tone={attTone(s.att || 0)} />
          </View>
        ))}

        {/* ---- Waalidka: parents and their mobile numbers ---- */}
        {tab === 'waalidka' && parents.map((p, i) => (
          <View key={i} style={[styles.rowCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Avatar name={p.name} code={'par_' + i} size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowName, { color: c.ink }]}>{p.name}</Text>
              <Text style={[styles.rowMeta, { color: c.muted }]} numberOfLines={1}>Waalidka: {p.children.join(', ')}</Text>
            </View>
            <View style={[styles.phonePill, { backgroundColor: c.blueSoft }]}>
              <Icon name="phone" size={12} color={c.navy} />
              <Text style={[styles.phoneTxt, { color: c.navy }]}>{p.phone}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* same website student profile UI — read-only for the ministry */}
      <StudentProfileModal
        visible={!!detail}
        student={detail}
        className={detail ? classNameById.get(detail.class_id) : ''}
        readOnly
        onClose={() => setDetail(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  banner: { height: 290, alignItems: 'center', paddingTop: 54, paddingHorizontal: 20, overflow: 'hidden' },
  backLink: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2 },
  backTxt: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  emblemRing: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  ministryName: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 26 },

  gateWrap: { flex: 1, paddingHorizontal: 20, marginTop: -60, paddingBottom: 28 },
  gateCard: { borderWidth: 1, borderRadius: 22, padding: 26, alignItems: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' },
  gateIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  gateTitle: { fontSize: 20, fontWeight: '800' },
  gateSub: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 19 },
  codeInput: { width: '100%', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 16, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginTop: 20 },
  errTxt: { fontSize: 12.5, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  gateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  gateBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gateFootRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingTop: 14, borderTopWidth: 1, width: '100%', justifyContent: 'center' },
  gateFootTxt: { fontSize: 11.5, fontWeight: '600' },
  poweredBy: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', marginTop: 22, letterSpacing: 0.3 },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 17, fontWeight: '800' },
  hSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statN: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },

  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 4, gap: 4, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabTxt: { fontSize: 13, fontWeight: '800' },

  rowCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  rowName: { fontSize: 14.5, fontWeight: '800' },
  rowMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  phonePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  phoneTxt: { fontSize: 12, fontWeight: '800' },
});
