/**
 * ToolPalette — the left-hand drawing palette (Create / Reactions /
 * Stereochemistry / Special sections). Extracted verbatim from
 * HexGridWithToolbar to shrink that file; it is purely presentational and
 * communicates only through the props below.
 */
import React from 'react';
import ToolButton from './ToolButton.jsx';
import {
  ArrowCCWSemicircleTopLeft,
  ArrowCWSemicircleTopCenter,
  ArrowCWQuarterTopRight,
  ArrowCCWSemicircleBottomLeft,
  ArrowCWSemicircleBottomCenter,
  ArrowCWQuarterBottomRight,
} from './CurvedArrowIcons.jsx';

export default function ToolPalette({ mode, setModeAndClearSelection, colors, isDarkMode }) {
  return (
    <>
        {/* Toolbar Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginBottom: 'calc(min(280px, 25vw) * 0.001)',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Create</div>
        
        {/* Draw/Erase Buttons as icon buttons side by side */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 0 }}>
          <ToolButton active={mode === 'draw'} onClick={() => setModeAndClearSelection('draw')} title="Draw Mode" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)' }}>
            {(c) => (
              <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            )}
          </ToolButton>
          <ToolButton active={mode === 'mouse'} onClick={() => setModeAndClearSelection('mouse')} title="Mouse Mode" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)' }}>
            {(c) => (
              <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                <path d="M6 3L12 17L14.5 12.5L19 10.5L6 3Z" fill={c} stroke={c} strokeWidth="1.2" strokeLinejoin="round"/>
                <rect x="16.3" y="16" width="3.5" height="7" rx="1.5" fill={c} stroke={c} strokeWidth="0.5" transform="rotate(316 12.75 18.5)"/>
              </svg>
            )}
          </ToolButton>
        </div>
        {/* Erase and Text mode buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginBottom: 0, marginTop: 'max(2px, calc(min(280px, 25vw) * 0.006))' }}>
          <ToolButton active={mode === 'erase'} onClick={() => setModeAndClearSelection('erase')} title="Erase Mode" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)' }}>
            {(c) => (
              <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
                <g transform="rotate(45 13 13)">
                  <rect x="6" y="10" width="14" height="6" rx="1.5" fill={c} stroke={c} strokeWidth="1.5"/>
                  <line x1="13" y1="10" x2="13" y2="16" stroke={mode === 'erase' ? colors.button : colors.surface} strokeWidth="1.5"/>
                </g>
              </svg>
            )}
          </ToolButton>
          <ToolButton active={mode === 'text'} onClick={() => setModeAndClearSelection('text')} title="Text Mode" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)' }}>
            {(c) => (
              <svg width="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" height="max(18px, min(24px, calc(min(280px, 25vw) * 0.086)))" viewBox="0 0 24 24" fill="none" style={{ pointerEvents: 'none' }}>
                <text x="5" y="18" fill={c} style={{ font: 'bold 20px "Times New Roman", serif' }}>T</text>
              </svg>
            )}
          </ToolButton>
        </div>

        {/* Buttons for charges/lone pairs */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(2px, calc(min(280px, 25vw) * 0.006))' }}>
          <ToolButton active={mode === 'plus'} onClick={() => setModeAndClearSelection('plus')} title="Add Positive Charge" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)' }}>
            {(c) => (
              <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
                <circle cx="13" cy="13" r="9" stroke={c} strokeWidth="2.2" fill="none" />
                <g stroke={c} strokeWidth="2.2" strokeLinecap="round">
                  <line x1="13" y1="8.5" x2="13" y2="17.5" />
                  <line x1="8.5" y1="13" x2="17.5" y2="13" />
                </g>
              </svg>
            )}
          </ToolButton>
          <ToolButton active={mode === 'minus'} onClick={() => setModeAndClearSelection('minus')} title="Add Negative Charge" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)' }}>
            {(c) => (
              <svg width="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 26 26" fill="none" style={{ pointerEvents: 'none' }}>
                <circle cx="13" cy="13" r="9" stroke={c} strokeWidth="2.2" fill="none" />
                <line x1="8.5" y1="13" x2="17.5" y2="13" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </ToolButton>
          <ToolButton active={mode === 'lone'} onClick={() => setModeAndClearSelection('lone')} title="Add Lone Pair" colors={colors} style={{ aspectRatio: '1/1', height: 'min(44px, 7vh)', borderRadius: 'calc(min(240px, 22vw) * 0.019)' }}>
            {(c) => (
              <svg width="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" height="max(16px, min(22px, calc(min(280px, 25vw) * 0.079)))" viewBox="0 0 22 22" fill="none" style={{ pointerEvents: 'none' }}>
                <circle cx="7" cy="11" r="2.6" fill={c} />
                <circle cx="15" cy="11" r="2.6" fill={c} />
              </svg>
            )}
          </ToolButton>
        </div>

        
        {/* Reactions Section Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(0px, min(calc(min(280px, 25vw) * 0.001), 0vh))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Reactions</div>
        {/* Arrow and Equilibrium Arrow Buttons side by side */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          <button
            onClick={() => setModeAndClearSelection('arrow')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'arrow' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'arrow' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'arrow') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'arrow') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <line x1="6" y1="13" x2="32" y2="13" stroke={mode === 'arrow' ? '#fff' : colors.textSecondary} strokeWidth="3" strokeLinecap="round" />
              <polygon points="32,7 44,13 32,19" fill={mode === 'arrow' ? '#fff' : colors.textSecondary} />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('equil')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'equil' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'equil' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'equil') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'equil') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Equilibrium Arrow"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Top arrow: left to right */}
              <line x1="8" y1="10" x2="34" y2="10" stroke={mode === 'equil' ? '#fff' : colors.textSecondary} strokeWidth="3" strokeLinecap="round" />
              <polygon points="34,5 44,10 34,15" fill={mode === 'equil' ? '#fff' : colors.textSecondary} />
              {/* Bottom arrow: right to left */}
              <line x1="38" y1="18" x2="12" y2="18" stroke={mode === 'equil' ? '#fff' : colors.textSecondary} strokeWidth="3" strokeLinecap="round" />
              <polygon points="12,13 2,18 12,23" fill={mode === 'equil' ? '#fff' : colors.textSecondary} />
            </svg>
          </button>
        </div>
        {/* Six arrow buttons in two rows, three columns, each as a separate component for future extensibility */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'max(4px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
          marginTop: '0px',
        }}>
          {/* Arrow 1: CCW Shallow (Top Left) */}
          <button
            onClick={() => setModeAndClearSelection('curve2')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve2' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve2' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'curve2') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve2') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Counterclockwise semicircle (top left)"
          ><ArrowCCWSemicircleTopLeft mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 2: CW Semicircle (Top Center) */}
          <button
            onClick={() => setModeAndClearSelection('curve1')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve1' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve1' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'curve1') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve1') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise semicircle (top center)"
          ><ArrowCWSemicircleTopCenter mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 3: CW Quarter-circle (Top Right) */}
          <button
            onClick={() => setModeAndClearSelection('curve0')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve0' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve0' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'curve0') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve0') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise quarter (top right)"
          ><ArrowCWQuarterTopRight mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 4: CCW Semicircle (Bottom Left) */}
          <button
            onClick={() => setModeAndClearSelection('curve5')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve5' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve5' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'curve5') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve5') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Counterclockwise semicircle (bottom left)"
          ><ArrowCCWSemicircleBottomLeft mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 5: CW Semicircle (Bottom Center) */}
          <button
            onClick={() => setModeAndClearSelection('curve4')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve4' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve4' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'curve4') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve4') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise semicircle (bottom center)"
          ><ArrowCWSemicircleBottomCenter mode={mode} isDarkMode={isDarkMode} /></button>
          {/* Arrow 6: CW Quarter-circle (Bottom Right) */}
          <button
            onClick={() => setModeAndClearSelection('curve3')}
            className="toolbar-button"
            style={{
              height: 'min(44px, 7vh)',
              backgroundColor: mode === 'curve3' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'curve3' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'curve3') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'curve3') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Clockwise quarter (bottom right)"
          ><ArrowCWQuarterBottomRight mode={mode} isDarkMode={isDarkMode} /></button>
        </div>
        {/* Stereochemistry Section Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(0px, min(calc(min(280px, 25vw) * 0.001), 0vh))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Stereochemistry</div>
        {/* Stereochemistry buttons - wedge, dash, ambiguous */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'max(6px, calc(min(280px, 25vw) * 0.025))', marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))' }}>
          <button
            onClick={() => setModeAndClearSelection('wedge')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'wedge' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'wedge' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'wedge') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'wedge') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Wedge Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <polygon points="6,13 38,6 38,20" fill={mode === 'wedge' ? '#fff' : colors.textSecondary} />
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('dash')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'dash' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'dash' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'dash') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'dash') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Dash Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Updated dash bond icon to better reflect actual appearance with perpendicular lines that get progressively wider */}
              <g transform="translate(6, 13)">
                <line x1="0" y1="0" x2="32" y2="0" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="1" strokeOpacity="0" />
                <line x1="3" y1="-1" x2="3" y2="1" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="-2" x2="9" y2="2" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="15" y1="-3" x2="15" y2="3" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="-4" x2="21" y2="4" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="27" y1="-5" x2="27" y2="5" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
                <line x1="33" y1="-6" x2="33" y2="6" stroke={mode === 'dash' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </button>
          <button
            onClick={() => setModeAndClearSelection('ambiguous')}
            className="toolbar-button"
            style={{
              flex: 1,
              height: 'min(44px, 7vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'ambiguous' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'ambiguous' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'ambiguous') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'ambiguous') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Ambiguous Bond"
          >
            <svg width="max(32px, min(46px, calc(min(280px, 25vw) * 0.164)))" height="max(18px, min(26px, calc(min(280px, 25vw) * 0.093)))" viewBox="0 0 46 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              <path
                d= " M 4 13 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0 q 4 8 8 0 q 4 -8 8 0"
                stroke={mode === 'ambiguous' ? '#fff' : colors.textSecondary}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                />
            </svg>
          </button>
        </div>

        {/* Special Section Title */}
        <div style={{
          color: '#666',
          fontWeight: 600,
          fontSize: 'max(11px, min(calc(min(280px, 25vw) * 0.052), 2vh))',
          letterSpacing: '0.04em',
          marginTop: 'max(0px, min(calc(min(280px, 25vw) * 0.001), 0vh))',
          textAlign: 'left',
          userSelect: 'none',
          fontFamily: 'Roboto, sans-serif',
        }}>Special</div>
        
        {/* Special buttons in 2x4 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 'max(4px, min(calc(min(280px, 25vw) * 0.025), 1.5vh))',
          marginTop: 'max(6px, calc(min(280px, 25vw) * 0.025))',
        }}>
          {/* Triple Bond Button */}
          <button
            onClick={() => setModeAndClearSelection('triple')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mode === 'triple' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              cursor: 'pointer',
              boxShadow: mode === 'triple' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (mode !== 'triple') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'triple') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Triple Bond"
          >
            <svg width="max(24px, min(32px, calc(min(280px, 25vw) * 0.114)))" height="max(14px, min(18px, calc(min(280px, 25vw) * 0.064)))" viewBox="0 0 32 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
              {/* Triple bond - three parallel lines (smaller) */}
              <line x1="4" y1="5" x2="28" y2="5" stroke={mode === 'triple' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="9" x2="28" y2="9" stroke={mode === 'triple' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="13" x2="28" y2="13" stroke={mode === 'triple' ? '#fff' : colors.textSecondary} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          
          {/* Benzene preset button */}
          <button
            onClick={() => setModeAndClearSelection('benzene')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'benzene' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'benzene' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'benzene') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'benzene') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Benzene Ring"
          >
            {/* Benzene ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Benzene ring structure with alternating single/double bonds */}
              <g transform="translate(60, 60)">
                {/* Bond 0: Double bond (top-right) */}
                <g>
                  <line x1="40" y1="-10" x2="80" y2="12" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="42" y1="8" x2="66" y2="22" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 1: Single bond (right) */}
                <line x1="80" y1="12" x2="80" y2="60" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 2: Double bond (bottom-right) */}
                <g>
                  <line x1="80" y1="60" x2="40" y2="82" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="66" y1="52" x2="44" y2="65" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 3: Single bond (bottom-left) */}
                <line x1="40" y1="82" x2="0" y2="60" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                
                {/* Bond 4: Double bond (left) */}
                <g>
                  <line x1="0" y1="60" x2="0" y2="12" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                  <line x1="14" y1="50" x2="14" y2="21" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                </g>
                
                {/* Bond 5: Single bond (top-left) */}
                <line x1="0" y1="12" x2="40" y2="-10" stroke={mode === 'benzene' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclohexane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclohexane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclohexane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclohexane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'cyclohexane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclohexane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclohexane Ring"
          >
            {/* Cyclohexane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclohexane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in hexagon pattern */}
                <line x1="40" y1="-10" x2="80" y2="12" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="12" x2="80" y2="60" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="80" y1="60" x2="40" y2="82" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="40" y1="82" x2="0" y2="60" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="60" x2="0" y2="12" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>
                <line x1="0" y1="12" x2="40" y2="-10" stroke={mode === 'cyclohexane' ? '#fff' : colors.textSecondary} strokeWidth="7" strokeLinecap="round"/>

              </g>
            </svg>
          </button>
          
          {/* Cyclopentane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclopentane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclopentane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclopentane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'cyclopentane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclopentane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclopentane Ring"
          >
            {/* Cyclopentane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclopentane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in pentagon pattern */}
                <line x1="40" y1="0" x2="80" y2="30" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="80" y1="30" x2="66" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="66" y1="80" x2="20" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="0" y1="30" x2="16" y2="80" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
                <line x1="40" y1="0" x2="0" y2="30" stroke={mode === 'cyclopentane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap = "round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclobutane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclobutane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclobutane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclobutane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'cyclobutane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclobutane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclobutane Ring"
          >
            {/* Cyclobutane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclobutane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in square pattern */}
                <line x1="0" y1="0" x2="80" y2="0" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="0" x2="80" y2="80" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="80" y1="80" x2="0" y2="80" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="0" y2="0" stroke={mode === 'cyclobutane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Cyclopropane preset button */}
          <button
            onClick={() => setModeAndClearSelection('cyclopropane')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'cyclopropane' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'cyclopropane' ? 
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'cyclopropane') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'cyclopropane') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Cyclopropane Ring"
          >
            {/* Cyclopropane ring SVG preview (enlarged) */}
            <svg width="32" height="32" viewBox="40 40 120 120" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Cyclopropane ring structure with all single bonds */}
              <g transform="translate(60, 60)">
                {/* All single bonds in triangle pattern */}
                <line x1="80" y1="80" x2="40" y2="0" stroke={mode === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="80" y2="80" stroke={mode === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
                <line x1="0" y1="80" x2="40" y2="0" stroke={mode === 'cyclopropane' ? '#fff' : colors.textSecondary} strokeWidth="8" strokeLinecap="round"/>
              </g>
            </svg>
          </button>
          
          {/* Chair conformation preset button */}
          <button
            onClick={() => setModeAndClearSelection('chair')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'chair' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'chair' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'chair') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'chair') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Chair Conformation"
          >
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" style={{ pointerEvents: 'none' }}>
              {/* Match placed chair orientation/shape */}
              <g stroke={mode === 'chair' ? '#fff' : colors.textSecondary} strokeWidth="2.8" strokeLinecap="round">
                <path d="M5.4 27.8 L11.2 14.6 L20.2 17.0 L33.0 13.8 L27.2 27.0 L18.2 22.8 Z" />
              </g>
              <g stroke={mode === 'chair' ? '#fff' : colors.textSecondary} strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.72">
                <line x1="5.4" y1="27.8" x2="5.4" y2="33.2" />
                <line x1="11.2" y1="14.6" x2="11.2" y2="8.8" />
                <line x1="20.2" y1="17.0" x2="20.2" y2="11.2" />
                <line x1="33.0" y1="13.8" x2="33.0" y2="8.0" />
                <line x1="27.2" y1="27.0" x2="27.2" y2="32.8" />
                <line x1="18.2" y1="22.8" x2="18.2" y2="28.5" />
                </g>
            </svg>
          </button>

          {/* Newman projection preset button */}
          <button
            onClick={() => setModeAndClearSelection('newman')}
            className="toolbar-button"
            style={{
              aspectRatio: '1/1',
              backgroundColor: mode === 'newman' ? colors.buttonActive : colors.button,
              border: `1px solid ${colors.border}`,
              borderRadius: 'calc(min(280px, 25vw) * 0.019)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: mode === 'newman' ?
                '0 4px 12px rgba(54,98,227,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)' :
                '0 2px 4px rgba(0,0,0,0.05)',
              outline: 'none',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              if (mode !== 'newman') {
                e.target.style.backgroundColor = colors.buttonHover;
                e.target.style.boxShadow = `0 3px 6px ${colors.shadow}`;
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'newman') {
                e.target.style.backgroundColor = colors.button;
                e.target.style.boxShadow = `0 2px 4px ${colors.shadow}`;
              }
            }}
            title="Newman Projection"
          >
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" style={{ pointerEvents: 'none' }}>
              <circle
                cx="20"
                cy="20"
                r="10"
                stroke={mode === 'newman' ? '#fff' : colors.textSecondary}
                strokeWidth="2.4"
              />
              <g stroke={mode === 'newman' ? '#fff' : colors.textSecondary} strokeWidth="2.4" strokeLinecap="round">
                {/* Front carbon bonds: ~1.35x circle radius from center */}
                <line x1="20" y1="20" x2="20" y2="6.5" />
                <line x1="20" y1="20" x2="31.7" y2="26.8" />
                <line x1="20" y1="20" x2="8.3" y2="26.8" />
              </g>
              <g stroke={mode === 'newman' ? '#fff' : colors.textSecondary} strokeWidth="2.2" strokeLinecap="round">
                {/* Back carbon bonds: start at circle edge, extend outward */}
                <line x1="28.7" y1="15.0" x2="35.9" y2="10.8" />
                <line x1="20.0" y1="30.0" x2="20.0" y2="38.0" />
                <line x1="11.3" y1="15.0" x2="4.1" y2="10.8" />
              </g>
            </svg>
          </button>
        </div>
    </>
  );
}
