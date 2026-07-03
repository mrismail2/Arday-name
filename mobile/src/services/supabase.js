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

/* Create an account. `meta` may only carry display fields (e.g. full_name) —
   the handle_new_user() trigger reads full_name but ALWAYS sets
   role = 'pending' and school_id = null, ignoring anything else in `meta`
   (never send role/school_id here; the server would ignore them anyway).
   Use provisionSchool() or wait for an admin to call assignRole() next. */
export async function signUpWithEmail(email, password, meta = {}) {
  const { data, error } = await requireClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: meta.full_name || '' } },
  });
  if (error) throw error;
  return data;
}

/* DISABLED server-side as of migration 0008 — self-service "sign up and
   become admin of your own new school" is not the product's rule; only a
   verified super_admin may create a school (see createSchoolAsSuperAdmin
   below). Calling this now always fails with a permission error; kept only
   so nothing throws a ReferenceError if something still imports it. */
export async function provisionSchool(name, slug, location) {
  const { data, error } = await requireClient().rpc('provision_school', {
    p_name: name,
    p_slug: slug,
    p_location: location || null,
  });
  if (error) throw error;
  return data;
}

/* super_admin-only: create a school and assign a specific PENDING profile
   as its first school_admin. The database re-checks the caller is really
   super_admin and the target is really pending with no school — this call
   cannot itself grant privileges the caller doesn't have. Returns the new
   school id. */
export async function createSchoolAsSuperAdmin(name, slug, location, initialAdminProfileId) {
  const { data, error } = await requireClient().rpc('create_school_as_super_admin', {
    p_name: name,
    p_slug: slug,
    p_location: location || null,
    p_initial_admin_profile_id: initialAdminProfileId,
  });
  if (error) throw error;
  return data;
}

/* Admin-only: assign a role (and optionally a school) to another profile.
   The database re-checks the caller is a school_admin of that school or a
   super_admin — this call cannot itself grant privileges it doesn't have. */
export async function assignRole(profileId, role, schoolId) {
  const { error } = await requireClient().rpc('assign_role', {
    p_profile_id: profileId,
    p_role: role,
    p_school_id: schoolId || null,
  });
  if (error) throw error;
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

/* Update the caller's own SAFE profile fields only. role/school_id are
   deliberately not accepted here — even if a caller passed them, the
   database's guard_profile_privileged_fields() trigger rejects the write.
   Use assignRole() (admin) or provisionSchool() (self-service) for those. */
export async function updateMyProfile({ full_name, phone, avatar_url } = {}) {
  const client = requireClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const patch = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (phone !== undefined) patch.phone = phone;
  if (avatar_url !== undefined) patch.avatar_url = avatar_url;
  const { error } = await client.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
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
