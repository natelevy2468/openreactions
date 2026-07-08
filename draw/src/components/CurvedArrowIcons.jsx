/**
 * Curved-arrow toolbar icons
 *
 * The six electron-pushing / curved-arrow buttons in the Reactions section of
 * the toolbar. Each is a self-contained SVG that highlights (white) when its
 * matching curve mode is active, and otherwise uses the theme's muted stroke.
 * Extracted verbatim from HexGridWithToolbar to keep that file focused on
 * canvas logic.
 */

const iconColor = (active, isDarkMode) => (active ? '#fff' : (isDarkMode ? '#b3b3b3' : '#666'));

// 1. Counterclockwise Semicircle (Top Left)
export function ArrowCCWSemicircleTopLeft({ mode, isDarkMode = false }) {
  const color = iconColor(mode === 'curve2', isDarkMode);
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M14 34 A14 14 0 1 1 36 20" stroke={color}
      strokeWidth="3.5"
      fill="none"
      strokeLinecap="round"/>
      <polygon points="29,20 43,20 36,28" fill={color}/>
    </svg>
  );
}
// 2. Clockwise Semicircle (Top Center)
export function ArrowCWSemicircleTopCenter({ mode, isDarkMode = false }) {
  const color = iconColor(mode === 'curve1', isDarkMode);
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M12 24 A12 12 0 0 1 36 24" stroke={color}
      strokeWidth="3.5"
      fill="none"
      strokeLinecap="round"/>
      <polygon points="29,24 43,20 38,29" fill={color}/>
    </svg>
  );
}
// 3. Clockwise Quarter-circle (Top Right)
export function ArrowCWQuarterTopRight({ mode, isDarkMode = false }) {
  const color = iconColor(mode === 'curve0', isDarkMode);
  return (
    <svg width="48" height="48" viewBox="0 6 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M10 32 A22 22 0 0 1 38 32" stroke={color}
       strokeWidth="3.5"
        fill="none"
       strokeLinecap="round"/>
      <polygon points="31,35 40,25 42,35" fill={color}/>
    </svg>
  );
}
// 4. Counterclockwise Semicircle (Bottom Left)
export function ArrowCCWSemicircleBottomLeft({ mode, isDarkMode = false }) {
  const color = iconColor(mode === 'curve5', isDarkMode);
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <g transform="scale(1,-1) translate(0,-45)">
        <path d="M14 34 A14 14 0 1 1 36 20"
          stroke={color}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"/>
        <polygon points="29,20 43,20 36,28" fill={color}/>
      </g>
    </svg>
  );
}
// 5. Clockwise Semicircle (Bottom Center)
export function ArrowCWSemicircleBottomCenter({ mode, isDarkMode = false }) {
  const color = iconColor(mode === 'curve4', isDarkMode);
  return (
    <svg width="48" height="48" viewBox="0 4 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M12 24 A12 12 0 0 0 36 24"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      <polygon points="29,24 38,19 42,28" fill={color}/>
    </svg>
  );
}
// 6. Clockwise Quarter-circle (Bottom Right)
export function ArrowCWQuarterBottomRight({ mode, isDarkMode = false }) {
  const color = iconColor(mode === 'curve3', isDarkMode);
  return (
    <svg width="48" height="48" viewBox="0 15 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M10 38 A22 22 0 0 0 38 38"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"/>
      <polygon points="33,33 43,43 43,33" fill={color}/>
    </svg>
  );
}
