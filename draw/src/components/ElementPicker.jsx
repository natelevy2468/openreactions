import React, { useState } from 'react';
import EditorPopover from './EditorPopover.jsx';
export const ELEMENT_SYMBOLS = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
export default function ElementPicker({ colors, mode, onSelect }) {
  const [query, setQuery] = useState('');
  return <EditorPopover label="Elements" side="right" colors={colors}>{close => <>
    <label>Find by symbol or atomic number<input aria-label="Find element" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cl or 17" style={{width:'100%'}} /></label>
    <p className="element-help"><strong>Shortcuts</strong><br />Hover an atom and press its single-letter symbol (C, N, O, H, S, P, F, I…). For any symbol or label, press <kbd>Enter</kbd> while hovering and type it. Or choose an element here, then click to place it.</p>
    <div className="element-grid">{ELEMENT_SYMBOLS.map((symbol,i) => ({symbol,number:i+1})).filter(e => !query || e.symbol.toLowerCase().startsWith(query.toLowerCase()) || String(e.number) === query).map(({symbol,number}) => <button key={symbol} title={`${symbol} · atomic number ${number}`} aria-label={`Element ${symbol}`} aria-pressed={mode==='atom:'+symbol} onClick={() => {onSelect('atom:'+symbol);close();}} style={mode==='atom:'+symbol?{background:colors.buttonActive,color:'#fff'}:{}}><small style={{display:'block',fontSize:10}}>{number}</small>{symbol}</button>)}</div>

  </>}</EditorPopover>;
}
