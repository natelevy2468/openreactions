/**
 * ToolButton — the single source of truth for the left-toolbar icon buttons.
 *
 * Every tool/template/reaction button in the palette shared the same ~40 lines
 * of inline-styled markup (active highlight, hover shadow, focus reset). This
 * collapses that to one component so the toolbar reads as data, not boilerplate.
 *
 * Icons are passed as children. When children is a function it receives the
 * resolved icon color (white while active, secondary text color otherwise) so an
 * SVG can tint its stroke/fill to match the active state.
 */
import React from 'react';

const ACTIVE_SHADOW =
  '0 4px 12px rgba(118,80,197,0.3), 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)';
const RADIUS = 'calc(min(280px, 25vw) * 0.019)';

export default function ToolButton({ active, onClick, title, colors, style, children }) {
  return (
    <button
      onClick={onClick}
      className="toolbar-button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? colors.buttonActive : colors.button,
        border: `1px solid ${colors.border}`,
        borderRadius: RADIUS,
        cursor: 'pointer',
        boxShadow: active ? ACTIVE_SHADOW : '0 2px 4px rgba(0,0,0,0.05)',
        padding: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = colors.buttonHover;
          e.currentTarget.style.boxShadow = `0 3px 6px ${colors.shadow}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = colors.button;
          e.currentTarget.style.boxShadow = `0 2px 4px ${colors.shadow}`;
        }
      }}
    >
      {typeof children === 'function' ? children(active ? '#fff' : colors.textSecondary) : children}
    </button>
  );
}
