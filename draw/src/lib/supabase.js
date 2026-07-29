/**
 * The Supabase client, or null when no backend is configured.
 *
 * Keys come from the root `supabase-config.js`, loaded by a plain <script> tag
 * before the bundle (see draw/index.html) so the homepage and this app read the
 * exact same file. Every caller must tolerate `supabase === null`: with no
 * backend the app still works, it just keeps drawings in local storage and hides
 * the account UI.
 */
import { createClient } from '@supabase/supabase-js';

const config = (typeof window !== 'undefined' && window.OPENREACTIONS_CONFIG) || {};

const url = (config.supabaseUrl || '').trim();
const anonKey = (config.supabaseAnonKey || '').trim();

/** True when both keys are filled in and look plausible. */
export const isSupabaseConfigured = Boolean(url && anonKey && /^https?:\/\//.test(url));

/**
 * 'auto' (the default) | true | false — whether to offer "Continue with Google".
 *
 * On 'auto' we ask the project which providers are switched on, so enabling
 * Google in the Supabase dashboard makes the button appear with no code change
 * and no redeploy, and an unconfigured provider can never be clicked.
 */
export const googleSignInMode =
  config.enableGoogleSignIn === undefined ? 'auto' : config.enableGoogleSignIn;

const GOOGLE_CACHE_KEY = 'openreactions.googleProvider';

/** @returns {Promise<boolean>} does this project have the Google provider enabled? */
export async function isGoogleProviderEnabled() {
  if (googleSignInMode !== 'auto') return Boolean(googleSignInMode);
  if (!isSupabaseConfigured) return false;
  try {
    const cached = window.sessionStorage?.getItem(GOOGLE_CACHE_KEY);
    if (cached !== null && cached !== undefined) return cached === 'true';
  } catch {
    /* private browsing — just ask again */
  }
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!res.ok) return false;
    const settings = await res.json();
    const enabled = Boolean(settings?.external?.google);
    try {
      window.sessionStorage?.setItem(GOOGLE_CACHE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
    return enabled;
  } catch {
    // Offline or blocked: hide the button rather than offer something that fails.
    return false;
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Session in local storage keeps the user signed in across reloads and
        // is shared with the homepage (same origin, same storage key).
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Human-readable reason the account UI is hidden, for the console. */
if (!isSupabaseConfigured && typeof console !== 'undefined') {
  console.info(
    '[OpenReactions] No backend configured — drawings are saved in this browser only. ' +
      'Fill in supabase-config.js to enable accounts (see SUPABASE_SETUP.md).'
  );
}
