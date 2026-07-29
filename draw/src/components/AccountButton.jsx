import React from 'react';

/**
 * The nav's account control: a "Sign in" button when signed out, an initial-avatar
 * with a small menu when signed in. Hidden entirely when no backend is configured,
 * so an unconfigured deployment shows no dead UI.
 *
 * @param {boolean}  isConfigured
 * @param {Object}   user           Supabase user or null
 * @param {boolean}  loading        Session not yet known — render a placeholder
 * @param {boolean}  menuOpen
 * @param {Function} onToggleMenu
 * @param {Function} onSignInClick
 * @param {Function} onSignOut
 * @param {Object}   colors
 */
const ACCENT = 'rgb(54,98,227)';

export default function AccountButton({
  isConfigured,
  user,
  loading,
  menuOpen,
  onToggleMenu,
  onSignInClick,
  onSignOut,
  colors,
}) {
  if (!isConfigured) return null;

  // Reserve the space rather than flashing "Sign in" at someone who is signed in.
  if (loading) return <div style={{ width: '34px', height: '34px' }} />;

  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        style={{
          backgroundColor: ACCENT,
          color: '#fff',
          border: 'none',
          padding: '8px 14px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'Roboto, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.15s ease-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Sign in
      </button>
    );
  }

  const email = user.email || '';
  const initial = (email[0] || '?').toUpperCase();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} data-account-menu>
      <button
        onClick={onToggleMenu}
        title={email}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          border: menuOpen ? `2px solid ${ACCENT}` : '2px solid transparent',
          background: ACCENT,
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: 'Roboto, sans-serif',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxShadow: menuOpen ? '0 0 0 3px rgba(54,98,227,0.25)' : 'none',
          transition: 'box-shadow 0.15s ease-out',
        }}
      >
        {initial}
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '10px',
            minWidth: '220px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: `0 8px 16px ${colors.shadow}`,
            padding: '12px',
            zIndex: 1000,
            fontFamily: 'Roboto, sans-serif',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              right: '12px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: `8px solid ${colors.surface}`,
            }}
          />
          <div style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.04em' }}>SIGNED IN AS</div>
          <div
            style={{
              fontSize: '13.5px',
              color: colors.text,
              marginTop: '3px',
              marginBottom: '12px',
              wordBreak: 'break-all',
            }}
          >
            {email}
          </div>
          <button
            onClick={onSignOut}
            style={{
              width: '100%',
              padding: '8px 0',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'inherit',
              color: colors.text,
              background: colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.button;
            }}
          >
            Sign out
          </button>
          <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '10px', lineHeight: 1.45 }}>
            Signing out leaves this drawing in the browser — it syncs again next time
            you sign in.
          </div>
        </div>
      )}
    </div>
  );
}
