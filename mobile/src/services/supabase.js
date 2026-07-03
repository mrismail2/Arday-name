/* ============================================================
   Kobciye — Supabase client (Phase 2 backend foundation)

   Reads the project URL + anon key from Expo public env vars
   (mobile/.env — see mobile/.env.example). Sessions persist in
   AsyncStorage so login survives app restarts.

   isSupabaseConfigured() lets screens keep working against the
   local AsyncStorage prototype store until the backend is wired.
   ============================================================ */
import 'react-native-url-polyfill/auto';
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
function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured (see mobile/.env.example)');
  return supabase;
}

/* Create an account. `meta` may carry full_name/role/school_id — the
   handle_new_user() trigger copies them into profiles on signup. */
export async function signUpWithEmail(email, password, meta = {}) {
  const { data, error } = await requireClient().auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/* Restore the persisted session on app start (null when logged out). */
export async function restoreSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

/* Subscribe to login/logout/refresh events; returns an unsubscribe fn. */
export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

/* Email a password-reset link. `redirectTo` must be listed under
   Auth → URL Configuration in the Supabase dashboard (e.g. kobciye://reset). */
export async function resetPassword(email, redirectTo) {
  const { error } = await requireClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/* After following a reset link (or while signed in): set a new password. */
export async function updatePassword(newPassword) {
  const { error } = await requireClient().auth.updateUser({ password: newPassword });
  if (error) throw error;
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
