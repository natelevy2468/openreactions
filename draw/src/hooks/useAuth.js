/**
 * Session state, plus the handful of auth actions the UI needs.
 *
 * `loading` is true only until the first session check resolves, so the nav can
 * avoid flashing "Sign in" at someone who is already signed in.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, googleSignInMode, isGoogleProviderEnabled } from '../lib/supabase.js';

/** Turns Supabase's terser messages into something a chemist can act on. */
const friendlyAuthError = (error) => {
  if (!error) return null;
  const message = error.message || String(error);
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password don’t match an account. If you just signed up, check your inbox for a confirmation link.';
  }
  if (/user already registered|already been registered/i.test(message)) {
    return 'There’s already an account with that email — try signing in instead.';
  }
  if (/password should be at least/i.test(message)) {
    return 'Password needs to be at least 6 characters.';
  }
  if (/for security purposes/i.test(message)) {
    return 'Too many attempts in a row — wait a few seconds and try again.';
  }
  if (/unable to validate email|invalid email/i.test(message)) {
    return 'That doesn’t look like a valid email address.';
  }
  if (/failed to fetch|networkerror/i.test(message)) {
    return 'Couldn’t reach the server. Check your connection and try again.';
  }
  return message;
};

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [googleEnabled, setGoogleEnabled] = useState(googleSignInMode === true);

  // Ask the project whether Google is configured (see isGoogleProviderEnabled).
  // Only worth doing while signed out — that's the only time the button shows.
  useEffect(() => {
    if (googleSignInMode !== 'auto' || !isSupabaseConfigured || session) return undefined;
    let cancelled = false;
    isGoogleProviderEnabled().then((enabled) => {
      if (!cancelled) setGoogleEnabled(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data?.session ?? null);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    // Fires for sign-in, sign-out and token refresh — and in other tabs too, so
    // signing out on the homepage signs you out here as well.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: 'No backend configured.' };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: friendlyAuthError(error) };
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: 'No backend configured.' };
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: friendlyAuthError(error) };
    // With "Confirm email" on, signUp returns a user but no session: the account
    // isn't usable until the link is clicked. Tell them rather than silently
    // leaving them signed out.
    if (data?.user && !data?.session) {
      return { error: null, needsConfirmation: true };
    }
    return { error: null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: 'No backend configured.' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    return { error: friendlyAuthError(error) };
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    if (!supabase) return { error: 'No backend configured.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    return { error: friendlyAuthError(error) };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    isConfigured: isSupabaseConfigured,
    googleEnabled,
    signIn,
    signUp,
    signInWithGoogle,
    sendPasswordReset,
    signOut,
  };
}
