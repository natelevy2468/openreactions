/**
 * OpenReactions backend configuration — the single place these values live.
 *
 * Both the homepage (index.html) and the drawing app (/draw/) load this file at
 * runtime, so there is nothing to rebuild after editing it.
 *
 * Fill in the two values from your Supabase project:
 *   Project Settings -> API -> Project URL / anon public key
 * See SUPABASE_SETUP.md for the full walkthrough.
 *
 * Leaving them blank is fine: accounts and cloud sync switch off, and drawings
 * are kept in this browser's local storage instead.
 *
 * The anon key is safe to publish — Row Level Security is what protects the
 * data. Never put the service_role key here.
 */
window.OPENREACTIONS_CONFIG = {
  // Project URL only — no path. The client appends /auth/v1 and /rest/v1 itself.
  supabaseUrl: 'https://bbyskqvfkuplmuforgfg.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJieXNrcXZma3VwbG11Zm9yZ2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDUzNzgsImV4cCI6MjEwMDkyMTM3OH0.Ad13vyqQoRJGC-wP6JQ-ZdWAYiGsO83aGmrnNrliu4U',

  // 'auto' asks your project which providers are switched on, so enabling Google
  // in the Supabase dashboard makes the button appear on its own — no redeploy —
  // and it can never show up unconfigured. Use true/false to force it.
  enableGoogleSignIn: 'auto',
};
