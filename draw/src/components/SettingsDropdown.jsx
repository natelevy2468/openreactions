import React from 'react';

/**
 * Settings dropdown (opened from the gear icon) — dark-mode toggle, Copy-as-SMILES,
 * and Import-from-SMILES. Extracted verbatim from HexGridWithToolbar to shrink that
 * file. Purely presentational; all state and handlers are passed in. Renders nothing
 * unless `show` is true.
 *
 * @param {boolean}  show
 * @param {Object}   colors            Theme colors
 * @param {boolean}  isDarkMode
 * @param {Function} setIsDarkMode
 * @param {Function} onCopySmiles      Handler for the Copy button
 * @param {Object}   smilesResult      { smiles, copied, warnings } or null
 * @param {string}   smilesInput       Controlled value of the import field
 * @param {Function} setSmilesInput
 * @param {Function} onImportSmiles    Handler for Add / Enter
 * @param {Object}   smilesImportMessage { text, isError } or null
 */
export default function SettingsDropdown({
  show,
  colors,
  isDarkMode,
  setIsDarkMode,
  onCopySmiles,
  smilesResult,
  smilesInput,
  setSmilesInput,
  onImportSmiles,
  smilesImportMessage,
}) {
  if (!show) return null;

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '100%',
      backgroundColor: colors.surface,
      minWidth: '280px',
      boxShadow: `0 8px 16px ${colors.shadow}`,
      borderRadius: '8px',
      border: `1px solid ${colors.border}`,
      zIndex: 1000,
      marginTop: '8px',
      padding: '16px',
      fontSize: '14px',
      lineHeight: '1.4',
      fontFamily: 'Roboto, sans-serif',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '20px',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: `8px solid ${colors.surface}`
      }} />
      <div style={{
        color: colors.text,
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '16px'
      }}>
        Settings
      </div>

      {/* Dark Mode Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '2px'
          }}>
            Dark Mode
          </span>
          <span style={{
            color: colors.textSecondary,
            fontSize: '12px'
          }}>
            Switch to dark color scheme
          </span>
        </div>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            position: 'relative',
            width: '44px',
            height: '24px',
            backgroundColor: isDarkMode ? colors.buttonActive : colors.button,
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '2px',
            left: isDarkMode ? '22px' : '2px',
            width: '20px',
            height: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }} />
        </button>
      </div>

      {/* Copy as SMILES */}
      <div style={{ padding: '12px 0' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              color: colors.text,
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '2px'
            }}>
              Copy as SMILES
            </span>
            <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
              Export the structure as a SMILES string
            </span>
          </div>
          <button
            onClick={onCopySmiles}
            style={{
              backgroundColor: colors.button,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'Roboto, sans-serif',
              whiteSpace: 'nowrap'
            }}
          >
            Copy
          </button>
        </div>

        {smilesResult && (
          <div style={{ marginTop: '10px' }}>
            <div style={{
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              padding: '8px 10px',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: colors.text,
              wordBreak: 'break-all',
              userSelect: 'all',
              maxHeight: '96px',
              overflowY: 'auto'
            }}>
              {smilesResult.smiles || '(empty — nothing drawn)'}
            </div>
            {smilesResult.copied && smilesResult.smiles && (
              <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '6px' }}>
                ✓ Copied to clipboard
              </div>
            )}
            {smilesResult.warnings && smilesResult.warnings.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                {smilesResult.warnings.map((w, i) => (
                  <div key={i} style={{ color: '#c77', fontSize: '12px', marginTop: '2px' }}>
                    ⚠ {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import from SMILES */}
      <div style={{ padding: '12px 0', borderTop: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
          <span style={{
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '2px'
          }}>
            Import from SMILES
          </span>
          <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Paste a SMILES string to add it to the canvas
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={smilesInput}
            onChange={(e) => setSmilesInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onImportSmiles(); }}
            placeholder="e.g. c1ccccc1"
            spellCheck={false}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: colors.background,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
          <button
            onClick={onImportSmiles}
            style={{
              backgroundColor: colors.buttonActive,
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'Roboto, sans-serif',
              whiteSpace: 'nowrap'
            }}
          >
            Add
          </button>
        </div>
        {smilesImportMessage && (
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: smilesImportMessage.isError ? '#c77' : colors.textSecondary
          }}>
            {smilesImportMessage.isError ? '⚠ ' : '✓ '}{smilesImportMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
