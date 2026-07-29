import React from 'react';

/**
 * About dialog — author info + keyboard-shortcut reference.
 * Extracted verbatim from HexGridWithToolbar to shrink that file. Renders nothing
 * unless `show` is true.
 *
 * @param {boolean}  show    Whether the popup is open
 * @param {Function} onClose Called to dismiss the popup
 * @param {Object}   colors  Theme colors (uses colors.border)
 */
const SHORTCUTS = [
  ['Draw', 'D'], ['Erase', 'E'],
  ['Select', 'M / Esc'], ['Text', 'T'],
  ['Reaction arrow', 'A'], ['Equilibrium', 'Q'],
  ['Benzene', 'R'], ['Rings 3–6', '3–6'],
  ['Charge + / −', 'G / J'], ['Lone pair', 'L'],
  ['Undo / Redo', '⌘Z / ⇧⌘Z'], ['Delete', '⌫'],
  ['Save now', '⌘S'],
];

export default function AboutPopup({ show, onClose, colors }) {
  if (!show) return null;

  return (
    <>
      {/* Overlay for dismissing popup by clicking outside */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 15,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 16,
          pointerEvents: 'auto',
          width: '400px',
          maxWidth: '90vw',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '2px solid #e0e0e0',
          padding: '30px',
          textAlign: 'center',
          fontFamily: '"Inter", "Segoe UI", "Arial", sans-serif',
        }}
      >
        <div style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: '20px',
          lineHeight: '1.4',
        }}>
          Made by: Nathan Levy PO '27
        </div>

        <div style={{
          fontSize: '18px',
          fontWeight: '500',
          color: '#333',
          marginBottom: '20px',
          lineHeight: '1.4',
        }}>
          text 925-808-9441 with questions!
        </div>

        <div style={{
          fontSize: '16px',
          fontWeight: '400',
          color: '#666',
          fontStyle: 'italic',
          lineHeight: '1.4',
        }}>
          still under development.
        </div>

        {/* How saving works — the question every new user asks first. */}
        <div style={{ marginTop: '22px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '8px', letterSpacing: '0.06em' }}>
            SAVING
          </div>
          <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.55 }}>
            Drawings save themselves — there's no save button. Your work stays in this
            browser even if you reload or close the tab, and signing in keeps it in your
            account so you can open it from anywhere. Use <b>My drawings</b> to switch
            between them, or click the name in the header to rename one.
          </div>
        </div>

        {/* Keyboard shortcut reference */}
        <div style={{ marginTop: '18px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#444', marginBottom: '10px', textAlign: 'center', letterSpacing: '0.06em' }}>
            KEYBOARD SHORTCUTS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 18px', fontSize: '12.5px' }}>
            {SHORTCUTS.map(([label, k]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#777' }}>{label}</span>
                <kbd style={{ fontFamily: 'ui-monospace, monospace', background: '#f1f3f5', border: '1px solid #e0e4e8', borderRadius: '4px', padding: '1px 6px', color: '#333', fontSize: '11.5px', whiteSpace: 'nowrap' }}>{k}</kbd>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11.5px', color: '#999', marginTop: '12px', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4 }}>
            Tip: double-click a reaction arrow to add reagents (above) or conditions (below).
          </div>
          <div style={{ fontSize: '11.5px', color: '#999', marginTop: '8px', textAlign: 'center', lineHeight: 1.4 }}>
            <span style={{ fontStyle: 'italic' }}>Abbreviations:</span> type a group on an atom (Enter on a
            vertex, or the T tool) — e.g. <b>Ph</b>, <b>Bn</b>, <b>OMe</b>, <b>OAc</b>, <b>CO₂Me</b>,{' '}
            <b>NO₂</b>, <b>CF₃</b>, <b>tBu</b>, <b>Ts</b>, <b>Boc</b>, <b>TMS</b>. They expand for the
            formula &amp; SMILES.
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '25px',
            backgroundColor: '#e9ecef',
            color: '#333',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#dee2e6'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#e9ecef'}
        >
          Close
        </button>
      </div>
    </>
  );
}
