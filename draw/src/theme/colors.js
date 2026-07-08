/**
 * Color palettes for light and dark mode.
 *
 * A single source of truth for the app's colors, keyed by theme. The canvas
 * renderers and the DOM UI both read from here, so light/dark stay consistent.
 */

const LIGHT_COLORS = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceHover: '#f5f5f5',
  border: '#e3e7eb',
  text: '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  button: '#e9ecef',
  buttonHover: '#dee2e6',
  buttonActive: 'rgb(54,98,227)',
  shadow: 'rgba(0,0,0,0.1)',
  canvasBackground: '#ffffff',
  gridLines: '#ddd',
  bonds: '#000000',
  atoms: '#000000',
};

const DARK_COLORS = {
  background: '#1a1a1a',
  surface: '#2d2d2d',
  surfaceHover: '#3a3a3a',
  border: '#404040',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  textTertiary: '#808080',
  button: '#404040',
  buttonHover: '#4a4a4a',
  buttonActive: 'rgb(54,98,227)', // Keep accent color the same across themes
  shadow: 'rgba(0,0,0,0.5)',
  canvasBackground: '#1a1a1a',
  gridLines: '#333333',
  bonds: '#ffffff',
  atoms: '#ffffff',
};

/**
 * @param {boolean} isDarkMode
 * @returns {typeof LIGHT_COLORS} the active color scheme
 */
export const getColorScheme = (isDarkMode) => (isDarkMode ? DARK_COLORS : LIGHT_COLORS);
