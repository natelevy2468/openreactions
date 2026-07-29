import React, { useEffect, useState } from 'react';
import { relativeTime } from '../lib/relativeTime.js';

/**
 * "My drawings" dropdown — the in-app document list.
 *
 * Follows SettingsDropdown's shape (absolute panel under its nav button, arrow
 * notch, fadeIn) so the header behaves consistently. Purely presentational: the
 * parent owns loading and every action.
 *
 * @param {boolean}  show
 * @param {Object}   colors
 * @param {Array}    drawings     [{ id, title, thumbnail, updated_at }]
 * @param {boolean}  loading
 * @param {string}   error
 * @param {string}   currentId    Highlighted as "open"
 * @param {Function} onOpen       (id) => void
 * @param {Function} onNew        () => void
 * @param {Function} onRename     (id, title) => void
 * @param {Function} onDuplicate  (id) => void
 * @param {Function} onDelete     (id) => void
 * @param {Function} onRefresh    () => void
 * @param {boolean}  signedIn
 * @param {Function} onSignInClick
 */
const ACCENT = 'rgb(54,98,227)';

export default function DrawingsPanel({
  show,
  colors,
  drawings,
  loading,
  error,
  currentId,
  onOpen,
  onNew,
  onRename,
  onDuplicate,
  onDelete,
  signedIn,
  onSignInClick,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Any close/reopen should start from a clean slate rather than resuming a
  // half-finished rename.
  useEffect(() => {
    if (!show) {
      setRenamingId(null);
      setConfirmDeleteId(null);
    }
  }, [show]);

  if (!show) return null;

  const commitRename = () => {
    if (renamingId) onRename(renamingId, renameValue.trim() || 'Untitled drawing');
    setRenamingId(null);
  };

  const iconButton = (label, title, onClick, danger = false) => (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '3px 6px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 500,
        fontFamily: 'inherit',
        color: danger ? '#c0392b' : colors.textSecondary,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? 'rgba(192,57,43,0.12)' : colors.surfaceHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        backgroundColor: colors.surface,
        width: '330px',
        maxWidth: '90vw',
        boxShadow: `0 8px 16px ${colors.shadow}`,
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        zIndex: 1000,
        marginTop: '8px',
        padding: '14px',
        fontSize: '14px',
        fontFamily: 'Roboto, sans-serif',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          right: '20px',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: `8px solid ${colors.surface}`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: colors.text, fontSize: '16px', fontWeight: 600 }}>My drawings</span>
        <button
          onClick={onNew}
          style={{
            background: ACCENT,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 11px',
            fontSize: '12.5px',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          + New
        </button>
      </div>

      {!signedIn && (
        <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.5 }}>
          This drawing is saved in your browser. Sign in to keep a history of your
          drawings and open them anywhere.
          <button
            onClick={onSignInClick}
            style={{
              display: 'block',
              marginTop: '12px',
              width: '100%',
              background: ACCENT,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '9px 0',
              fontSize: '13.5px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
      )}

      {signedIn && loading && (
        <div style={{ color: colors.textTertiary, fontSize: '13px', padding: '14px 0', textAlign: 'center' }}>
          Loading…
        </div>
      )}

      {signedIn && !loading && error && (
        <div
          style={{
            color: '#a32020',
            background: '#fdecec',
            border: '1px solid #f5c6c6',
            borderRadius: '6px',
            padding: '9px 11px',
            fontSize: '12.5px',
            lineHeight: 1.45,
          }}
        >
          {error}
        </div>
      )}

      {signedIn && !loading && !error && drawings.length === 0 && (
        <div style={{ color: colors.textTertiary, fontSize: '13px', padding: '10px 0', lineHeight: 1.5 }}>
          Nothing saved yet. Start drawing and it'll appear here automatically.
        </div>
      )}

      {signedIn && !loading && !error && drawings.length > 0 && (
        <div style={{ maxHeight: '340px', overflowY: 'auto', margin: '0 -6px' }}>
          {drawings.map((d) => {
            const isOpen = d.id === currentId;
            return (
              <div
                key={d.id}
                onClick={() => !isOpen && renamingId !== d.id && onOpen(d.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 6px',
                  borderRadius: '7px',
                  cursor: isOpen ? 'default' : 'pointer',
                  background: isOpen ? 'rgba(54,98,227,0.10)' : 'transparent',
                  transition: 'background 0.12s ease-out',
                }}
                onMouseEnter={(e) => {
                  if (!isOpen) e.currentTarget.style.backgroundColor = colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '36px',
                    flexShrink: 0,
                    borderRadius: '4px',
                    border: `1px solid ${colors.border}`,
                    background: '#fff',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {d.thumbnail ? (
                    <img
                      src={d.thumbnail}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '15px', color: '#ccc' }}>⬡</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === d.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        padding: '3px 5px',
                        border: `1px solid ${ACCENT}`,
                        borderRadius: '4px',
                        background: colors.background,
                        color: colors.text,
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '13.5px',
                        color: colors.text,
                        fontWeight: isOpen ? 600 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {d.title}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '1px' }}>
                    {isOpen ? 'Open now' : `Edited ${relativeTime(d.updated_at)}`}
                  </div>
                </div>

                <div style={{ display: 'flex', flexShrink: 0 }}>
                  {confirmDeleteId === d.id ? (
                    <>
                      {iconButton('Delete', 'Permanently delete', () => {
                        setConfirmDeleteId(null);
                        onDelete(d.id);
                      }, true)}
                      {iconButton('Keep', 'Cancel', () => setConfirmDeleteId(null))}
                    </>
                  ) : (
                    <>
                      {iconButton('Rename', 'Rename this drawing', () => {
                        setRenameValue(d.title);
                        setConfirmDeleteId(null);
                        setRenamingId(d.id);
                      })}
                      {iconButton('Copy', 'Duplicate this drawing', () => onDuplicate(d.id))}
                      {iconButton('✕', 'Delete this drawing', () => setConfirmDeleteId(d.id), true)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
