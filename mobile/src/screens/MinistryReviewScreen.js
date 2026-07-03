import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
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
        <View style={styles.gateWrap}>
          <TouchableOpacity onPress={onBack} hitSlop={10} style={[styles.backLink]}>
            <Icon name="back" size={20} color={c.muted} />
            <Text style={[styles.backTxt, { color: c.muted }]}>Ku noqo</Text>
          </TouchableOpacity>

          <View style={[styles.gateCard, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={[styles.gateIcon, { backgroundColor: c.greenSoft }]}>
              <Icon name="shield" size={30} color={c.green} />
            </View>
            <Text style={[styles.gateTitle, { color: c.ink }]}>Eegista Wasaaradda</Text>
            <Text style={[styles.gateSub, { color: c.muted }]}>Geli lambarka eegista ee dugsigu ku siiyay si aad u aragto casharrada la ansixiyay.</Text>

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
          </View>
        </View>
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
  gateWrap: { flex: 1, padding: 20, justifyContent: 'center' },
  backLink: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4 },
  backTxt: { fontSize: 13.5, fontWeight: '700' },
  gateCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' },
  gateIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  gateTitle: { fontSize: 20, fontWeight: '800' },
  gateSub: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 19 },
  codeInput: { width: '100%', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 16, fontWeight: '800', textAlign: 'center', letterSpacing: 2, marginTop: 20 },
  errTxt: { fontSize: 12.5, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  gateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  gateBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
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
