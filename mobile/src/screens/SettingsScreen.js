import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useRole } from '../context/RoleContext';
import ScreenHeader from '../components/ScreenHeader';
import SectionTitle from '../components/SectionTitle';
import Icon from '../components/Icon';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import SimpleFormModal from '../components/SimpleFormModal';
import { getSchoolSettings, updateSchoolSettings, validateStudentIdPrefix, previewStudentId } from '../services/appDataRepository';
import { changeStudentPassword } from '../services/studentAuthStorage';

const LANGS = ['Soomaali', 'English', 'العربية'];
const SETTINGS_KEY = 'kobciye_settings_v1';

/* Role-aware settings. Each group declares which roles may see it, so a
   parent only sees their own contact details while a School Admin sees the
   full school configuration. Management rows open a preview form whose
   values persist in AsyncStorage (frontend-only). */
const GROUPS = [
  {
    title: 'Akoonkayga', tone: 'blue',
    items: [
      { key: 'profile', icon: 'profile', label: 'My Profile', sub: 'Magaca, taleefoon, email',
        roles: ['superadmin', 'schooladmin', 'teacher', 'accountant', 'parent', 'student'],
        fields: [
          { key: 'name', label: 'MAGACA BUUXA', placeholder: 'Magacaaga', required: true },
          { key: 'phone', label: 'TALEEFOON', placeholder: '+252 …' },
          { key: 'email', label: 'EMAIL', placeholder: 'you@dugsi.edu' },
        ] },
    ],
  },
  {
    title: 'Dugsiga', tone: 'navy',
    items: [
      { key: 'idFormat', icon: 'students', label: 'Student ID Format', sub: 'Habka Aqoonsiga Ardayga',
        roles: ['superadmin', 'schooladmin'], custom: 'idFormat' },
      { key: 'schoolProfile', icon: 'building', label: 'School Profile', sub: 'Magaca, nooca, magaalada',
        roles: ['superadmin', 'schooladmin'],
        fields: [
          { key: 'name', label: 'MAGACA DUGSIGA', placeholder: 'Dugsiga Hidaayada', required: true },
          { key: 'type', label: 'NOOCA', options: ['Primary School', 'Secondary School', 'Mixed'] },
          { key: 'city', label: 'MAGAALADA', placeholder: 'Gabiley' },
        ] },
      { key: 'academic', icon: 'exams', label: 'Academic Year & Terms', sub: 'Sannadka & saddexmeeyaha',
        roles: ['superadmin', 'schooladmin'],
        fields: [
          { key: 'year', label: 'SANNADKA WAXBARASHADA', placeholder: '2025 / 2026', required: true },
          { key: 'terms', label: 'TIRADA TERMS', options: ['2', '3'] },
        ] },
      { key: 'classes', icon: 'classes', label: 'Classes & Subjects', sub: 'Fasallada & maaddooyinka',
        roles: ['superadmin', 'schooladmin'],
        fields: [
          { key: 'classes', label: 'TIRADA FASALLADA', placeholder: 'tusaale: 6' },
          { key: 'subjects', label: 'MAADDOOYINKA', placeholder: 'Xisaab, Sayniska, …', multiline: true },
        ] },
      { key: 'assignments', icon: 'teachers', label: 'Teacher Assignments', sub: 'Qoondaynta macalimiinta',
        roles: ['superadmin', 'schooladmin'], goPermissions: true },
      { key: 'grading', icon: 'reports', label: 'Grading & Pass Marks', sub: 'Heerka guulaha',
        roles: ['superadmin', 'schooladmin'],
        fields: [
          { key: 'pass', label: 'DHIBCAHA GUDBINTA (%)', placeholder: '50', required: true },
          { key: 'scale', label: 'NIDAAMKA DARAJOOYINKA', options: ['A–F', '0–100'] },
        ] },
    ],
  },
  {
    title: 'Maaliyadda', tone: 'gold',
    items: [
      { key: 'fees', icon: 'finance', label: 'Fee Settings', sub: 'Qiimaha & lacag-bixinta',
        roles: ['superadmin', 'schooladmin', 'accountant'],
        fields: [
          { key: 'monthly', label: 'LACAGTA BISHII (ARDAY)', placeholder: '$25', required: true },
          { key: 'methods', label: 'HABABKA LACAG-BIXINTA', placeholder: 'EVC Plus, Zaad, Cash' },
        ] },
      { key: 'exempt', icon: 'shield', label: 'Fee Exemption Rules', sub: 'Xeerarka dhaafitaanka',
        roles: ['superadmin', 'schooladmin', 'accountant'],
        fields: [
          { key: 'rule', label: 'XEERKA DHAAFITAANKA', placeholder: 'tusaale: agoonta', multiline: true },
        ] },
    ],
  },
  {
    title: 'Doorarka & Ogolaanshaha', tone: 'navy',
    items: [
      { key: 'roles', icon: 'shield', label: 'User Roles & Permissions', sub: 'Ogolaanshaha macalimiinta',
        roles: ['superadmin', 'schooladmin'], goPermissions: true },
    ],
  },
  {
    title: 'Platform', tone: 'blue',
    items: [
      { key: 'platform', icon: 'building', label: 'Platform Settings', sub: 'Dugsiyada & qorshooyinka',
        roles: ['superadmin'],
        fields: [
          { key: 'small', label: 'QIIMAHA SMALL ($/ARDAY)', placeholder: '0.07' },
          { key: 'large', label: 'QIIMAHA LARGE ($/ARDAY)', placeholder: '0.10' },
        ] },
    ],
  },
];

export default function SettingsScreen({ navigation }) {
  const { c, isDark, toggle } = useTheme();
  const { profile } = useRole();
  const [lang, setLang] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [editing, setEditing] = useState(null); // a management row
  const [done, setDone] = useState('');
  const [notif, setNotif] = useState({ push: true, email: false });

  // school the admin is configuring (Super Admin previews the platform school)
  const schoolId = profile.school_id === '*' ? 'school_001' : (profile.school_id || 'school_001');

  // Student ID Format (prefix) state
  const [showIdFmt, setShowIdFmt] = useState(false);
  const [prefix, setPrefix] = useState('KOB');
  const [seq, setSeq] = useState(1);
  const [idErr, setIdErr] = useState('');
  useEffect(() => {
    getSchoolSettings(schoolId).then((s) => { setPrefix(s.student_id_prefix); setSeq(s.next_student_sequence); });
  }, [schoolId]);

  // Student password change state
  const [showStuPw, setShowStuPw] = useState(false);
  const [pwCur, setPwCur] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConf, setPwConf] = useState('');
  const [pwErr, setPwErr] = useState('');

  // load persisted preview preferences
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((v) => {
      if (!v) return;
      try { const s = JSON.parse(v); if (s.lang != null) setLang(s.lang); if (s.notif) setNotif(s.notif); } catch (e) {}
    });
  }, []);
  const persist = (patch) => {
    const next = { lang, notif, ...patch };
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const flash = (m) => { setDone(m); setTimeout(() => setDone(''), 2200); };

  const openRow = (item) => {
    if (item.goPermissions) { navigation.navigate('Permissions'); return; }
    if (item.custom === 'idFormat') { setIdErr(''); setShowIdFmt(true); return; }
    setEditing(item);
  };

  // save the school's Student ID prefix (affects NEW students only)
  const saveIdFormat = async () => {
    const v = validateStudentIdPrefix(prefix);
    if (!v.ok) { setIdErr(v.error); return; }
    try {
      await updateSchoolSettings(schoolId, { student_id_prefix: v.value, next_student_sequence: seq });
      setPrefix(v.value); setShowIdFmt(false); flash('Habka Aqoonsiga waa la kaydiyay');
    } catch (e) { setIdErr(e.message); }
  };

  // a student changes ONLY their own password (UI preview)
  const saveStudentPw = async () => {
    try {
      await changeStudentPassword(profile.student_internal_id, pwCur, pwNew, pwConf);
      setShowStuPw(false); setPwCur(''); setPwNew(''); setPwConf(''); setPwErr('');
      flash('Password-kaaga waa la beddelay');
    } catch (e) { setPwErr(e.message); }
  };

  const groups = GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => it.roles.indexOf(profile.key) !== -1) }))
    .filter((g) => g.items.length);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Goobaha"
          subtitle={profile.labelSo}
          right={
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={[styles.back, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Icon name="back" size={20} color={c.ink} />
            </TouchableOpacity>
          }
        />

        {/* profile card */}
        <Card style={styles.profile}>
          <Avatar name={profile.name} code={profile.key} size={52} />
          <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
            <Text style={[styles.pName, { color: c.ink }]} numberOfLines={1}>{profile.name}</Text>
            <Text style={[styles.pSub, { color: c.muted }]} numberOfLines={1}>{profile.sub}</Text>
          </View>
          <Badge label={profile.labelSo} tone="navy" />
        </Card>

        {/* role-gated management groups */}
        {groups.map((g) => (
          <View key={g.title}>
            <SectionTitle title={g.title} tone={g.tone === 'navy' ? c.navy : g.tone === 'gold' ? c.gold : c.blue} />
            <Card padded={false}>
              {g.items.map((it, i) => (
                <TouchableOpacity key={it.key} onPress={() => openRow(it)}
                  style={[styles.item, { borderTopColor: c.line, borderTopWidth: i === 0 ? 0 : 1 }]}>
                  <View style={[styles.itemIcon, { backgroundColor: c.blueSoft }]}>
                    <Icon name={it.icon} size={18} color={c.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: c.ink }]}>{it.label}</Text>
                    <Text style={[styles.itemSub, { color: c.muted }]} numberOfLines={1}>{it.sub}</Text>
                  </View>
                  <Icon name="chevronRight" size={18} color={c.muted2} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Notifications (all roles) */}
        <SectionTitle title="Ogeysiisyada" tone={c.blue} />
        <Card padded={false}>
          <View style={styles.toggleRow}>
            <View style={styles.rowLeft}><Icon name="bell" size={18} color={c.ink2} /><Text style={[styles.rowTxt, { color: c.ink }]}>Push notifications</Text></View>
            <Switch value={notif.push} onValueChange={(v) => { const n = { ...notif, push: v }; setNotif(n); persist({ notif: n }); }} trackColor={{ true: c.blue }} />
          </View>
          <View style={[styles.toggleRow, { borderTopColor: c.line, borderTopWidth: 1 }]}>
            <View style={styles.rowLeft}><Icon name="mail" size={18} color={c.ink2} /><Text style={[styles.rowTxt, { color: c.ink }]}>Email notifications</Text></View>
            <Switch value={notif.email} onValueChange={(v) => { const n = { ...notif, email: v }; setNotif(n); persist({ notif: n }); }} trackColor={{ true: c.blue }} />
          </View>
        </Card>

        {/* Language & Appearance (all roles) */}
        <SectionTitle title="Luqadda & Muuqaalka" tone={c.gold} />
        <Card style={styles.row}>
          <View style={styles.rowLeft}><Icon name="moon" size={18} color={c.ink2} /><Text style={[styles.rowTxt, { color: c.ink }]}>Habka Madow (Dark)</Text></View>
          <Switch value={isDark} onValueChange={toggle} trackColor={{ true: c.blue }} />
        </Card>
        <Card padded={false} style={{ marginTop: 10 }}>
          {LANGS.map((l, i) => (
            <TouchableOpacity key={l} style={[styles.langRow, { borderTopColor: c.line, borderTopWidth: i === 0 ? 0 : 1 }]} onPress={() => { setLang(i); persist({ lang: i }); }}>
              <Text style={[styles.langTxt, { color: c.ink }]}>{l}</Text>
              {lang === i && <Icon name="check" size={16} color={c.blue} strokeWidth={2.5} />}
            </TouchableOpacity>
          ))}
        </Card>

        {/* Security & Login (all roles) */}
        <SectionTitle title="Amniga & Soo-galka" tone={c.navy} />
        {profile.key === 'student' ? (
          <View style={[styles.idCard, { backgroundColor: c.blueSoft, marginBottom: 10 }]}>
            <Text style={[styles.idCardLbl, { color: c.muted }]}>STUDENT ID (LOGIN)</Text>
            <Text style={[styles.idCardVal, { color: c.navy }]}>{profile.student_id}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={[styles.pwBtn, { backgroundColor: c.surface, borderColor: c.line }]}
          onPress={() => (profile.key === 'student' ? (setPwErr(''), setShowStuPw(true)) : setShowPw(true))}>
          <View style={[styles.itemIcon, { backgroundColor: c.blueSoft }]}><Icon name="key" size={18} color={c.navy} /></View>
          <Text style={[styles.itemLabel, { color: c.ink, flex: 1 }]}>Beddel Password-ka</Text>
          <Icon name="chevronRight" size={18} color={c.muted2} />
        </TouchableOpacity>

        {done ? <Text style={[styles.doneMsg, { color: c.green }]}>✓ {done}</Text> : null}

        <Text style={[styles.foot, { color: c.muted2 }]}>Frontend prototype — settings save locally for preview only.</Text>
      </ScrollView>

      {/* management form */}
      <SimpleFormModal
        visible={!!editing}
        title={editing ? editing.label : ''}
        saveLabel="Kaydi"
        fields={editing ? editing.fields : [{ key: 'x', label: '' }]}
        onClose={() => setEditing(null)}
        onSubmit={(vals) => { AsyncStorage.setItem('kobciye_set_' + editing.key, JSON.stringify(vals)).catch(() => {}); flash(editing.label + ' waa la kaydiyay'); }}
      />

      {/* change password */}
      <SimpleFormModal
        visible={showPw}
        title="Beddel Furaha"
        saveLabel="Kaydi Furaha"
        fields={[
          { key: 'old', label: 'FURAHA HADDA', placeholder: '••••••••', required: true },
          { key: 'new', label: 'FURAHA CUSUB', placeholder: 'Ugu yaraan 8 xaraf' },
          { key: 'conf', label: 'XAQIIJI FURAHA CUSUB', placeholder: 'Ku celi furaha cusub' },
        ]}
        onClose={() => setShowPw(false)}
        onSubmit={() => flash('Furaha si guul leh ayaa loo beddelay')}
      />

      {/* Student ID Format (prefix) — Super/School Admin only */}
      <Modal visible={showIdFmt} transparent animationType="slide" onRequestClose={() => setShowIdFmt(false)}>
        <View style={styles.mOverlay}>
          <View style={[styles.mSheet, { backgroundColor: c.surface }]}>
            <View style={styles.mHead}>
              <Text style={[styles.mTitle, { color: c.ink }]}>Habka Aqoonsiga Ardayga</Text>
              <TouchableOpacity onPress={() => setShowIdFmt(false)} hitSlop={10}><Icon name="close" size={20} color={c.muted} /></TouchableOpacity>
            </View>

            <Text style={[styles.mLabel, { color: c.muted }]}>PREFIX-KA DUGSIGA</Text>
            <TextInput value={prefix} onChangeText={(t) => { setPrefix(t.toUpperCase()); setIdErr(''); }}
              autoCapitalize="characters" placeholder="HID" placeholderTextColor={c.muted2}
              style={[styles.mInput, { backgroundColor: c.bg, borderColor: idErr ? c.rose : c.line, color: c.ink }]} />
            {idErr ? <Text style={[styles.mErr, { color: c.rose }]}>{idErr}</Text> : <Text style={[styles.mHint, { color: c.muted2 }]}>2–12 xaraf waaweyn / lambarro / xariiq (-). Tusaale: HID, ALM, NUR.</Text>}

            <View style={[styles.previewBox, { backgroundColor: c.blueSoft }]}>
              <Text style={[styles.previewLine, { color: c.navy }]}>Prefix: <Text style={{ fontWeight: '800' }}>{validateStudentIdPrefix(prefix).ok ? prefix : '—'}</Text></Text>
              <Text style={[styles.previewLine, { color: c.navy }]}>Next Student ID: <Text style={{ fontWeight: '800' }}>{previewStudentId({ student_id_prefix: validateStudentIdPrefix(prefix).ok ? prefix : 'KOB', next_student_sequence: seq })}</Text></Text>
            </View>

            <Text style={[styles.stabilityNote, { color: c.gold700, backgroundColor: c.goldSoft }]}>
              Beddelka prefix-ka wuxuu saameynayaa ardayda cusub. Aqoonsiyada ardayda hore si otomaatig ah looma beddelo.
            </Text>

            <TouchableOpacity style={[styles.mSave, { backgroundColor: c.navy }]} onPress={saveIdFormat}>
              <Text style={styles.mSaveTxt}>Kaydi Habka Aqoonsiga</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Student password change — student only, own account */}
      <Modal visible={showStuPw} transparent animationType="slide" onRequestClose={() => setShowStuPw(false)}>
        <View style={styles.mOverlay}>
          <View style={[styles.mSheet, { backgroundColor: c.surface }]}>
            <View style={styles.mHead}>
              <Text style={[styles.mTitle, { color: c.ink }]}>Beddel Password-ka</Text>
              <TouchableOpacity onPress={() => setShowStuPw(false)} hitSlop={10}><Icon name="close" size={20} color={c.muted} /></TouchableOpacity>
            </View>

            <Text style={[styles.mLabel, { color: c.muted }]}>STUDENT ID</Text>
            <TextInput value={profile.student_id || ''} editable={false}
              style={[styles.mInput, { backgroundColor: c.bg, borderColor: c.line, color: c.muted }]} />

            <Text style={[styles.mLabel, { color: c.muted }]}>PASSWORD-KA HADDA</Text>
            <TextInput value={pwCur} onChangeText={setPwCur} secureTextEntry placeholder="••••••••" placeholderTextColor={c.muted2}
              style={[styles.mInput, { backgroundColor: c.bg, borderColor: c.line, color: c.ink }]} />
            <Text style={[styles.mLabel, { color: c.muted }]}>PASSWORD CUSUB</Text>
            <TextInput value={pwNew} onChangeText={(t) => { setPwNew(t); setPwErr(''); }} secureTextEntry placeholder="Ugu yaraan 8 xaraf" placeholderTextColor={c.muted2}
              style={[styles.mInput, { backgroundColor: c.bg, borderColor: c.line, color: c.ink }]} />
            <Text style={[styles.mLabel, { color: c.muted }]}>XAQIIJI PASSWORD CUSUB</Text>
            <TextInput value={pwConf} onChangeText={(t) => { setPwConf(t); setPwErr(''); }} secureTextEntry placeholder="Ku celi password-ka cusub" placeholderTextColor={c.muted2}
              style={[styles.mInput, { backgroundColor: c.bg, borderColor: pwErr ? c.rose : c.line, color: c.ink }]} />
            {pwErr ? <Text style={[styles.mErr, { color: c.rose }]}>{pwErr}</Text> : null}

            <TouchableOpacity style={[styles.mSave, { backgroundColor: c.navy }]} onPress={saveStudentPw}>
              <Text style={styles.mSaveTxt}>Kaydi Password-ka</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  back: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center' },
  pName: { fontSize: 17, fontWeight: '800' },
  pSub: { fontSize: 12.5, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  itemIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontSize: 14.5, fontWeight: '700' },
  itemSub: { fontSize: 12, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTxt: { fontSize: 14.5, fontWeight: '600' },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 },
  langTxt: { fontSize: 14.5, fontWeight: '600' },
  pwBtn: { padding: 12, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneMsg: { fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  foot: { fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 22, lineHeight: 17 },
  idCard: { padding: 14, borderRadius: 14 },
  idCardLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  idCardVal: { fontSize: 18, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  mOverlay: { flex: 1, backgroundColor: 'rgba(10,27,45,.5)', justifyContent: 'flex-end' },
  mSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mTitle: { fontSize: 17, fontWeight: '800' },
  mLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginTop: 12, marginBottom: 6 },
  mInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontWeight: '700' },
  mHint: { fontSize: 11.5, fontWeight: '600', marginTop: 6 },
  mErr: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  previewBox: { marginTop: 14, padding: 13, borderRadius: 12, gap: 4 },
  previewLine: { fontSize: 13.5, fontWeight: '600' },
  stabilityNote: { fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 12, padding: 11, borderRadius: 10 },
  mSave: { marginTop: 16, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
