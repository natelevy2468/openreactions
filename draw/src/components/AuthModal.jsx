import React, { useEffect, useRef, useState } from 'react';

/**
 * Sign in / create account dialog.
 *
 * Styled to match AboutPopup (white card, 12px radius, Inter) and the nav's
 * #7650c5 accent, so it reads as part of the app rather than a bolted-on
 * auth screen.
 *
 * @param {boolean}  show
 * @param {Function} onClose
 * @param {Object}   colors            Theme colors (uses colors.border)
 * @param {Function} onSignIn          (email, password) => { error }
 * @param {Function} onSignUp          (email, password) => { error, needsConfirmation }
 * @param {Function} onGoogle          () => { error }
 * @param {Function} onResetPassword   (email) => { error }
 * @param {boolean}  googleEnabled     Show the Google button
 * @param {string}   [reason]          Why the dialog opened, shown above the form
 */
const ACCENT = '#7650c5';

/** Google's mark, inlined so the button needs no network request. */
const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

export default function AuthModal({
  show,
  onClose,
  colors,
  onSignIn,
  onSignUp,
  onGoogle,
  onResetPassword,
  googleEnabled,
  reason,
}) {
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    setError(null);
    setNotice(null);
    setBusy(false);
    // Focus lands in the first field, so the whole flow is keyboard-only.
    const t = setTimeout(() => emailRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [show, tab]);

  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  if (!show) return null;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: colors.text,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: '6px',
    letterSpacing: '0.02em',
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError('Enter your email address.');
    if (password.length < 6) return setError('Password needs to be at least 6 characters.');

    setBusy(true);
    const result = tab === 'signin' ? await onSignIn(email, password) : await onSignUp(email, password);
    setBusy(false);

    if (result?.error) return setError(result.error);
    if (result?.needsConfirmation) {
      return setNotice(`Almost there — click the confirmation link we sent to ${email.trim()}, then sign in.`);
    }
    // A live session closes the dialog; the caller re-renders as signed in.
    onClose();
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first, then click "Forgot password".');
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    const result = await onResetPassword(email);
    setBusy(false);
    if (result?.error) setError(result.error);
    else setNotice(`Password reset link sent to ${email.trim()}.`);
  };

  const tabButton = (key, label) => (
    <button
      type="button"
      onClick={() => {
        setTab(key);
        setError(null);
        setNotice(null);
      }}
      style={{
        flex: 1,
        padding: '9px 0',
        fontSize: '13.5px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        border: 'none',
        borderRadius: '7px',
        background: tab === key ? ACCENT : 'transparent',
        color: tab === key ? '#ffffff' : colors.textSecondary,
        boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
        transition: 'all 0.15s ease-out',
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 30, backgroundColor: 'rgba(0,0,0,0.5)' }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 31,
          width: '380px',
          maxWidth: '90vw',
          backgroundColor: colors.surface,
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: `2px solid ${colors.border}`,
          padding: '28px',
          fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
        }}
      >
        <div style={{ fontSize: '19px', fontWeight: 600, color: colors.text, textAlign: 'center' }}>
          {tab === 'signin' ? 'Sign in to OpenReactions' : 'Create an account'}
        </div>
        <div style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', marginTop: '7px', lineHeight: 1.5 }}>
          {reason || 'Keep your drawings across devices and pick up where you left off.'}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: colors.button,
            padding: '4px',
            borderRadius: '9px',
            margin: '20px 0 18px',
          }}
        >
          {tabButton('signin', 'Sign in')}
          {tabButton('signup', 'Create account')}
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle} htmlFor="or-auth-email">Email</label>
            <input
              id="or-auth-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = ACCENT;
                e.target.style.boxShadow = '0 0 0 3px rgba(118,80,197,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '6px' }}>
            <label style={labelStyle} htmlFor="or-auth-password">Password</label>
            <input
              id="or-auth-password"
              type="password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signin' ? '••••••••' : 'At least 6 characters'}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = ACCENT;
                e.target.style.boxShadow = '0 0 0 3px rgba(118,80,197,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {tab === 'signin' && (
            <button
              type="button"
              onClick={forgotPassword}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '12px',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Forgot password?
            </button>
          )}

          {error && (
            <div
              style={{
                marginTop: '14px',
                padding: '9px 11px',
                borderRadius: '8px',
                background: '#fdecec',
                border: '1px solid #f5c6c6',
                color: '#a32020',
                fontSize: '12.5px',
                lineHeight: 1.45,
              }}
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              style={{
                marginTop: '14px',
                padding: '9px 11px',
                borderRadius: '8px',
                background: '#eaf3ea',
                border: '1px solid #c4e0c4',
                color: '#256b2b',
                fontSize: '12.5px',
                lineHeight: 1.45,
              }}
            >
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: '18px',
              width: '100%',
              padding: '11px 0',
              fontSize: '14.5px',
              fontWeight: 600,
              fontFamily: 'inherit',
              color: '#fff',
              background: busy ? 'rgba(118,80,197,0.6)' : ACCENT,
              border: 'none',
              borderRadius: '8px',
              cursor: busy ? 'default' : 'pointer',
              transition: 'background 0.15s ease-out',
            }}
          >
            {busy ? 'Working…' : tab === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
              <div style={{ flex: 1, height: '1px', background: colors.border }} />
              <span style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: colors.border }} />
            </div>
            <button
              type="button"
              onClick={onGoogle}
              style={{
                width: '100%',
                padding: '10px 0',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                color: '#3c4043',
                background: '#fff',
                border: '1px solid #d9dee4',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f7f8fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              <GoogleMark />
              Continue with Google
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '9px 0',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'inherit',
            color: colors.textSecondary,
            background: colors.button,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Not now
        </button>

        <div style={{ fontSize: '11.5px', color: colors.textTertiary, textAlign: 'center', marginTop: '14px', lineHeight: 1.5 }}>
          Without an account your work still stays in this browser — signing in just
          adds sync and history.
        </div>
      </div>
    </>
  );
}
