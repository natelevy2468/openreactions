import { displayAtoms } from './displayAtoms.js';
import { detectAllRingsEnhanced } from './RingDetectionUtils.js';
import { renderDoubleBondByCase } from './DoubleBondRenderer.js';
import { renderAllStereochemistryBonds } from './StereochemistryRenderer.js';
import { renderAllAtomText, getAtomLabelHalfExtents } from './TextRenderer.js';
import { renderAllLonePairsAndCharges } from './LonePairRenderer.js';

/** Render clipboard chemistry with the same ring and stereo conventions as the canvas. */
export function renderMoleculePreview(ctx, molecule, offset, colors) {
  const { vertices, bonds } = molecule;
  const atoms = displayAtoms(bonds, molecule.atoms);
  const rings = detectAllRingsEnhanced(bonds, vertices);
  const count = v => bonds.filter(b => Math.hypot(b.x1-v.x,b.y1-v.y)<.01 || Math.hypot(b.x2-v.x,b.y2-v.y)<.01).length;
  const clipped = bonds.map(b => {
    const next = {...b}, length = Math.hypot(b.x2-b.x1,b.y2-b.y1) || 1, ux=(b.x2-b.x1)/length, uy=(b.y2-b.y1)/length;
    for (const end of [1,2]) {
      const atom = atoms[`${b['x'+end].toFixed(2)},${b['y'+end].toFixed(2)}`];
      const box = atom && getAtomLabelHalfExtents(ctx, atom);
      if (!box) continue;
      const gap = Math.min(box.halfW/(Math.abs(ux)||1e-10),box.halfH/(Math.abs(uy)||1e-10))+3;
      next['x'+end] += ux*gap*(end===1?1:-1); next['y'+end] += uy*gap*(end===1?1:-1);
    }
    return next;
  });
  const stereo = renderAllStereochemistryBonds(ctx,clipped,offset,colors);
  clipped.forEach((b,i) => {
    if (stereo.has(i)) return;
    if (b.bondOrder===2) { renderDoubleBondByCase(ctx,b,offset,colors,{segments:bonds,detectedRings:rings,countVertexBonds:count,geomBond:bonds[i]}); return; }
    const angle=Math.atan2(b.y2-b.y1,b.x2-b.x1)+Math.PI/2;
    for (const distance of b.bondOrder===3?[0,-8.5,8.5]:[0]) {
      ctx.strokeStyle=colors.bonds; ctx.lineWidth=3; ctx.beginPath();
      ctx.moveTo(b.x1+offset.x+Math.cos(angle)*distance,b.y1+offset.y+Math.sin(angle)*distance);
      ctx.lineTo(b.x2+offset.x+Math.cos(angle)*distance,b.y2+offset.y+Math.sin(angle)*distance);ctx.stroke();
    }
  });
  renderAllAtomText(ctx,vertices,atoms,offset,colors);
  renderAllLonePairsAndCharges(ctx,vertices,bonds,atoms,offset,colors);
}
