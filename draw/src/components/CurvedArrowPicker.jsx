import React from 'react';
import EditorPopover from './EditorPopover.jsx';
import { CURVE_PRESETS } from '../utils/curvedArrowPresets.js';
import { ArrowCWQuarterTopRight, ArrowCWSemicircleTopCenter, ArrowCCWSemicircleTopLeft,
  ArrowCWQuarterBottomRight, ArrowCWSemicircleBottomCenter, ArrowCCWSemicircleBottomLeft } from './CurvedArrowIcons.jsx';
const ICONS = [ArrowCWQuarterTopRight, ArrowCWSemicircleTopCenter, ArrowCCWSemicircleTopLeft,
  ArrowCWQuarterBottomRight, ArrowCWSemicircleBottomCenter, ArrowCCWSemicircleBottomLeft];
export default function CurvedArrowPicker({ mode, onSelect, colors, isDarkMode }) {
  const button = (preset, fishhook = false, close = () => {}) => {
    const selectedMode = (fishhook ? 'fishhook-' : '') + preset.mode;
    const Icon = ICONS[Number(preset.mode.slice(-1))];
    const label = `${preset.label} · ${fishhook ? 'single electron (fishhook)' : 'electron pair'}`;
    return <button key={selectedMode} title={label} aria-label={label} aria-pressed={mode===selectedMode}
      onClick={() => {onSelect(selectedMode);close();}}
      style={{background:mode===selectedMode?colors.buttonActive:colors.button,borderColor:colors.border}}>
      <Icon mode={mode} fishhook={fishhook} isDarkMode={isDarkMode} />
    </button>;
  };
  return <div className="curved-arrow-shortcuts" role="group" aria-label="Curved arrow shortcuts">
    {[0,1,3,4].map(i=>button(CURVE_PRESETS[i]))}
    <EditorPopover label="More curved arrows" side="right" colors={colors} compact>{close=><>
      <p className="arrow-picker-label">Electron pair · full arrowhead</p>
      <div className="curved-arrow-options">{CURVE_PRESETS.map(p=>button(p,false,close))}</div>
      <p className="arrow-picker-label">Single electron · fishhook</p>
      <div className="curved-arrow-options">{CURVE_PRESETS.map(p=>button(p,true,close))}</div>
      <p className="element-help">Click the start, then the end on the canvas. Use Select to adjust the curve.</p>
    </>}</EditorPopover>
  </div>;
}
