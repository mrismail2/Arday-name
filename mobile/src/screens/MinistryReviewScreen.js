import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { shadow } from '../theme/colors';
import { useLessons } from '../context/LessonsContext';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import LessonDetailModal from '../components/LessonDetailModal';

/* Ministry (Wasaarad) review portal — reached from the landing page, gated by
   the school's review code. The ministry is NOT a logged-in user: with a valid
   code they get a READ-ONLY view of every APPROVED lesson and can leave
   feedback (cabasho / talo) that the teacher then sees in the app. */
export default function MinistryReviewScreen({ onBack }) {
  const { c } = useTheme();
  const { lessons, reviewCode, addMinistryFeedback } = useLessons();
  const [code, setCode] = useState('');
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const approved = useMemo(() => lessons.filter((l) => l.status === 'approved'), [lessons]);
  // keep the open detail in sync with context updates (new feedback)
  const liveDetail = detail ? lessons.find((l) => l.id === detail.id) || detail : null;

  const submit = () => {
    if (code.trim().toUpperCase() === reviewCode.toUpperCase()) { setGranted(true); setError(''); }
    else setError('Lambarka eegista waa qaldan yahay. Isku day mar kale.');
  };

  // ---- gate: enter the review code ----
  if (!granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {/* ---- ministry banner: navy gradient, emblem, flag stripe ---- */}
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
                Portal-ka kormeerka Wasaaradda Waxbarashada iyo Sayniska.
                {'\n'}Geli lambarka eegista ee dugsigu ku siiyay si aad u aragto casharrada la ansixiyay.
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
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- portal: read-only approved lessons + feedback ----
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: c.line }]}>
        <TouchableOpacity onPress={onBack} hitSlop={10} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Icon name="back" size={20} color={c.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.hTitle, { color: c.ink }]}>Eegista Wasaaradda</Text>
          <Text style={[styles.hSub, { color: c.muted }]}>{approved.length} cashar la ansixiyay · daawasho keliya</Text>
        </View>
        <Badge label={reviewCode} tone="green" />
      </View>

      <FlatList
        data={approved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>🗂️ Weli cashar la ansixiyay ma jiro.</Text>}
        renderItem={({ item }) => {
          const fbN = (item.ministry_feedback || []).length;
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]} activeOpacity={0.85} onPress={() => setDetail(item)}>
              <View style={styles.cardTop}>
                <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>{item.title}</Text>
                <Icon name="chevronRight" size={16} color={c.muted} />
              </View>
              <View style={styles.metaRow}>
                <Icon name="lessons" size={13} color={c.muted} />
                <Text style={[styles.meta, { color: c.muted }]}>{item.subject} · {item.cls}</Text>
              </View>
              <View style={styles.metaRow}>
                <Avatar name={item.teacher} code={item.teacher} size={22} />
                <Text style={[styles.meta, { color: c.ink2 }]}>{item.teacher}</Text>
                {fbN ? (
                  <View style={[styles.fbCount, { backgroundColor: c.roseSoft }]}>
                    <Icon name="shield" size={11} color={c.rose} />
                    <Text style={[styles.fbCountTxt, { color: c.rose }]}>{fbN}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <LessonDetailModal
        visible={!!liveDetail}
        lesson={liveDetail}
        ministryMode
        onFeedback={addMinistryFeedback}
        onClose={() => setDetail(null)}
      />
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 17, fontWeight: '800' },
  hSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15.5, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  meta: { fontSize: 12.5, fontWeight: '600' },
  fbCount: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 'auto' },
  fbCountTxt: { fontSize: 11, fontWeight: '800' },
  empty: { fontSize: 13, fontWeight: '600', textAlign: 'center', padding: 30 },
});
