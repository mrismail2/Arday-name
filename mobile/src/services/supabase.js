/* ============================================================
   Kobciye — Supabase client (Phase 2 backend foundation)

   Reads the project URL + anon key from Expo public env vars
   (mobile/.env — see mobile/.env.example). Sessions persist in
   AsyncStorage so login survives app restarts.

   isSupabaseConfigured() lets screens keep working against the
   local AsyncStorage prototype store until the backend is wired.
   ============================================================ */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/* ---- auth helpers (role comes from the profiles table) ---- */
export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured (see mobile/.env.example)');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getMyProfile() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*, school:schools(*)')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

/* ---- storage helpers ---- */
export function schoolLogoUrl(schoolId, ext = 'png') {
  if (!supabase) return null;
  const { data } = supabase.storage
    .from('school-logos')
    .getPublicUrl(`${schoolId}/logo.${ext}`);
  return data ? data.publicUrl : null;
}

export async function studentPhotoUrl(schoolId, studentId, ext = 'jpg') {
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from('student-photos')
    .createSignedUrl(`${schoolId}/${studentId}.${ext}`, 3600);
  if (error) return null;
  return data.signedUrl;
}
