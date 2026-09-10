import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function EditorPopover({ label, side = 'bottom', colors, children }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({});
  const trigger = useRef(null), panel = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const box = trigger.current.getBoundingClientRect();
      const width = Math.min(side === 'right' ? 320 : 640, window.innerWidth - 24);
      setPosition({ width, left: Math.max(12, Math.min(side === 'right' ? box.right + 12 : box.left, window.innerWidth - width - 12)), top: side === 'right' ? Math.max(60, Math.min(box.top, window.innerHeight - 370)) : box.bottom + 8, maxHeight: side === 'right' ? Math.min(350, window.innerHeight - 80) : window.innerHeight - box.bottom - 20 });
    };
    place();
    panel.current?.focus();
    const outside = event => { if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', place);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', place); };
  }, [open, side]);
  return <>
    <button ref={trigger} className="editor-menu-trigger" aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog" onClick={() => setOpen(v => !v)} style={{ color: colors.text, background: open ? colors.button : 'transparent' }}>{label} <span aria-hidden="true">{side === 'right' ? '›' : '▾'}</span></button>
    {open && createPortal(<div ref={panel} id={id} role="dialog" aria-label={label} tabIndex={-1} className={'editor-popover chemistry-tools ' + (side === 'right' ? 'element-popover' : 'tools-popover')} style={{ ...position, background: colors.surface, color: colors.text, '--chem-bg': colors.button, '--chem-text': colors.text, '--chem-border': colors.border, '--chem-accent': colors.buttonActive }}>
      <div className="editor-popover-heading"><strong>{label}</strong><button aria-label={'Close ' + label} onClick={() => { setOpen(false); trigger.current?.focus(); }}>×</button></div>
      {typeof children === 'function' ? children(() => { setOpen(false); trigger.current?.focus(); }) : children}
    </div>, document.body)}
  </>;
}
