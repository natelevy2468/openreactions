import React from 'react';
export default function ChargeLegend({parts,colors,onClose}) {
  const unavailable=parts?.filter(p=>p.unavailable)||[];
  return <aside aria-label="Local charge legend" style={{position:'fixed',left:260,bottom:22,width:285,padding:14,borderRadius:12,background:colors.surface,color:colors.text,border:`1px solid ${colors.border}`,boxShadow:'0 4px 20px #00000012',fontSize:12,zIndex:4,maxWidth:'calc(100vw - 285px)'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><strong style={{fontSize:14}}>Local charge</strong><button aria-label="Hide local charge" onClick={onClose} style={{border:0,background:'transparent',color:colors.text,cursor:'pointer'}}>×</button></div>
    <div style={{height:9,borderRadius:8,background:'linear-gradient(90deg,#e13041,#cdcadb,#2a6eeb)'}} />
    <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}><span>− Negative</span><span>Neutral</span><span>Positive +</span></div>
    <p style={{marginBottom:0}}>{parts===null?'Calculating…':'Estimated partial charge · Gasteiger model'}</p>
    <p style={{color:colors.textSecondary,marginBottom:0}}>Implicit hydrogens contribute nearby charge regions. A 2D charge view, not a 3D electrostatic potential surface.</p>
    {!!unavailable.length && <p role="status">{unavailable.length} molecule(s) unavailable: {[...new Set(unavailable.map(p=>p.unavailable))].join('; ')}. Dashed outlines mark these molecules.</p>}
  </aside>;
}
