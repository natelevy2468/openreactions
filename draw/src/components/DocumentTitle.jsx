import React, { useEffect, useRef, useState } from 'react';

/**
 * The nav's document name and save state — the Google-Docs affordance that tells
 * you your work is safe.
 *
 * Click the title to rename (Enter commits, Escape reverts). The status line to
 * its right is deliberately quiet: it only draws attention when something is
 * wrong.
 *
 * @param {string}   title
 * @param {Function} onRename    (next) => void
 * @param {Function} onCommit    Flush the rename to the server
 * @param {string}   status      loading | clean | dirty | saving | saved | local | error
 * @param {string}   errorText
 */
const STATUS_TEXT = {
  loading: 'Opening…',
  saving: 'Saving…',
  dirty: 'Saving…',
  saved: 'All changes saved',
  clean: 'All changes saved',
  local: 'Saved on this device',
  // This covers both opening and saving failures; the tooltip explains which.
  error: 'Cloud unavailable — check save details',
  'storage-error': 'Browser storage unavailable — export a backup',
};

export default function DocumentTitle({ title, onRename, onCommit, status, errorText, colors, isDarkMode = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [title, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== title) {
      onRename(next);
      // Renaming is an explicit act; don't make the user wonder for a second
      // whether it stuck.
      setTimeout(() => onCommit?.(), 0);
    } else {
      setDraft(title);
    }
  };

  const statusText = STATUS_TEXT[status] || '';
  const textColor = colors?.text || '#222';
  const statusColor = (status === 'error' || status === 'storage-error')
    ? (isDarkMode ? '#ff7b7b' : '#a32020')
    : (colors?.textSecondary || '#6b6b6b');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0px', minWidth: 0 }}>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(title);
              setEditing(false);
            }
          }}
          maxLength={120}
          style={{
            fontSize: '15px',
            fontWeight: 400,
            fontFamily: 'Roboto, sans-serif',
            color: textColor,
            padding: '4px 8px',
            width: '260px',
            maxWidth: '34vw',
            background: colors?.surface || '#fff',
            border: '1px solid #7650c5',
            borderRadius: '5px',
            outline: 'none',
          }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Rename this drawing"
          style={{
            fontSize: '15px',
            fontWeight: 400,
            fontFamily: 'Roboto, sans-serif',
            color: textColor,
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: '5px',
            padding: '4px 8px',
            maxWidth: '34vw',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'text',
            transition: 'all 0.12s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)';
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {title}
        </button>
      )}

      {statusText && (
        <span
          role="status"
          aria-live="polite"
          style={{
            fontSize: '10px',
            paddingLeft: '8px',
            fontFamily: 'Roboto, sans-serif',
            color: statusColor,
            whiteSpace: 'nowrap',
            maxWidth: '30vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={(status === 'error' || status === 'storage-error') ? errorText || '' : undefined}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}
