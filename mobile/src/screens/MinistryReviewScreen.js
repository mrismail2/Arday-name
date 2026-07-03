import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { shadow } from '../theme/colors';
import { useLessons } from '../context/LessonsContext';
import { useRole } from '../context/RoleContext';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';

/* Demo/preview identity of the ministry official this review code was
   issued to, and the school it lets them inspect — REVIEW_CODE (WAS-HID-…)
   is scoped to Dugsiga Hidaayada, so this mirrors that. Phase 3: comes from
   the school's ministry-code record, not a constant. */
const INSPECTOR = {
  name: 'Ismaaciil Xasan Cige',
  role: 'Kormeeraha Waxbarashada',
  city: 'Hargeysa',
  school: 'Dugsiga Hidaayada',
  schoolCity: 'Gabiley',
};

/* Ministry (Wasaarad) code gate — reached from the landing page. A valid
   code identifies which school it was issued for, then signs the ministry
   official straight in as that school's admin (schooladmin) so they land on
   its real dashboard rather than a separate read-only view. */
export default function MinistryReviewScreen({ onBack, onEnterSchool }) {
  const { c } = useTheme();
  const { reviewCode } = useLessons();
  const { setRole } = useRole();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (code.trim().toUpperCase() === reviewCode.toUpperCase()) {
      setError('');
      setRole('schooladmin'); // the school this code belongs to (see INSPECTOR)
      onEnterSchool && onEnterSchool();
    } else {
      setError('Lambarka eegista waa qaldan yahay. Isku day mar kale.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* ---- ministry banner ---- */}
        <View style={styles.banner}>
          <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#0A2E6B" />
                <Stop offset="1" stopColor="#0F1B2D" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#bannerGrad)" />
            {/* soft decorative rings */}
            <Circle cx="-20" cy="20" r="90" fill="#13458F" opacity={0.35} />
            <Circle cx="380" cy="-30" r="110" fill="#CFAD5E" opacity={0.12} />
          </Svg>

          <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.backLink}>
            <Icon name="back" size={18} color="#fff" />
            <Text style={styles.backTxt}>Ku noqo</Text>
          </TouchableOpacity>

          <View style={styles.emblem}>
            <View style={styles.emblemRing}>
              <Icon name="shield" size={28} color="#fff" />
            </View>
          </View>
          <Text style={styles.ministryName}>Wasaaradda Waxbarashada{'\n'}iyo Sayniska</Text>
        </View>

        {/* ---- floating card: code entry, overlapping the banner ---- */}
        <View style={styles.gateWrap}>
          <View style={[styles.gateCard, shadow.card, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={[styles.gateIcon, { backgroundColor: c.greenSoft }]}>
              <Icon name="shield" size={28} color={c.green} />
            </View>
            <Text style={[styles.gateTitle, { color: c.ink }]}>Eegista Wasaaradda</Text>
            <Text style={[styles.gateSub, { color: c.muted }]}>
              Geli lambarka eegista ee dugsigu ku siiyay — si automatig ah ayaad ugu geli doontaa
              dugsiga lambarku ka tirsan yahay, adigoo maamule ah.
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
              <Text style={[styles.gateFootTxt, { color: c.muted2 }]}>Lambarka sax ah oo keliya ayaa dugsiga ku geliya</Text>
            </View>
          </View>

          {/* ---- who this code belongs to, and which school it covers ---- */}
          <View style={[styles.inspectorCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Avatar name={INSPECTOR.name} code="MW" size={38} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.inspectorName, { color: c.ink }]}>{INSPECTOR.name}</Text>
              <Text style={[styles.inspectorMeta, { color: c.muted }]}>{INSPECTOR.role} · {INSPECTOR.city}</Text>
            </View>
          </View>
          <View style={styles.inspectorSchoolRow}>
            <Icon name="students" size={13} color={c.muted2} />
            <Text style={[styles.inspectorSchoolTxt, { color: c.muted2 }]}>
              Dugsiga si automatig ah loo geli doono: <Text style={{ fontWeight: '800', color: c.muted }}>{INSPECTOR.school} · {INSPECTOR.schoolCity}</Text>
            </Text>
          </View>

          <Text style={[styles.poweredBy, { color: c.muted2 }]}>Powered by Kobciye</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  banner: { height: 300, alignItems: 'center', paddingTop: 54, paddingHorizontal: 20, overflow: 'hidden' },
  backLink: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2 },
  backTxt: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
  emblem: { marginBottom: 14 },
  emblemRing: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
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

  inspectorCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16,
    padding: 14, maxWidth: 420, width: '100%', alignSelf: 'center', marginTop: 16,
  },
  inspectorName: { fontSize: 14.5, fontWeight: '800' },
  inspectorMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  inspectorSchoolRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
    maxWidth: 420, width: '100%', alignSelf: 'center', marginTop: 10, paddingHorizontal: 8,
  },
  inspectorSchoolTxt: { fontSize: 12, fontWeight: '600' },
  poweredBy: { fontSize: 11.5, fontWeight: '700', textAlign: 'center', marginTop: 22, letterSpacing: 0.3 },
});
