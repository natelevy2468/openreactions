import { loadOCL } from './ocl.js';
import { graphToOCLMolecule } from './exportStructure.js';
import { splitComponents } from './moleculeGraph.js';
import { validateStructure } from './validateStructure.js';

// Gasteiger–Marsili PEOE parameters/iteration adapted from RDKit (BSD-3-Clause).
// Attribution and model limitations: docs/LOCAL_CHARGE.md and public/licenses/rdkit.txt.
const parameters = {
  H:[7.17,6.24,-.56], C:[[7.98,9.18,1.88],[8.79,9.32,1.51],[10.39,9.45,.73]],
  N:[[11.54,10.82,1.36],[12.87,11.15,.85],[15.68,11.7,-.27]],
  O:[[14.18,12.92,1.39],[17.07,13.79,.47]], F:[14.66,13.85,2.31],
  Cl:[11,9.69,1.35],Br:[10.08,8.47,1.16],I:[9.9,7.96,.96],
};
async function componentCharges(graph,OCL) {
  if(graph.atoms.length===1 && !parameters[graph.atoms[0].element] && graph.atoms[0].charge && !graph.atoms[0].radical) return graph.atoms.map(a=>({...a,atomCharge:a.charge,hydrogenCharge:0,hydrogens:0}));
  if(graph.atoms.some(a=>!parameters[a.element] || a.radical)) throw new Error('Unsupported element, abbreviation, or radical');
  if((await validateStructure(graph)).length) throw new Error('Resolve chemistry-check problems first');
  const {molecule:m}=graphToOCLMolecule(OCL,graph);
  m.ensureHelperArrays(OCL.Molecule.cHelperRings);
  const indices=graph.atoms.map(a=>{
    for(let i=0;i<m.getAllAtoms();i++) if(Math.abs(m.getAtomX(i)-a.x)<1e-6 && Math.abs(m.getAtomY(i)+a.y)<1e-6) return i;
    throw new Error('Atom mapping unavailable');
  });
  const neighbors=graph.atoms.map((_,i)=>graph.bonds.filter(b=>b.from===i||b.to===i).map(b=>b.from===i?b.to:b.from));
  const pi=indices.map(i=>m.getAtomPi(i));
  const conjugated=(i)=>neighbors[i].some(j=>pi[j]>0) && ['N','O'].includes(graph.atoms[i].element) && graph.atoms[i].charge<=0;
  const types=graph.atoms.map((a,i)=>{
    let t=Math.min(2,pi[i]);
    if(conjugated(i) || m.isAromaticAtom(indices[i]) || (a.element==='C' && a.charge!==0 && neighbors[i].length<=3)) t=Math.max(t,1);
    const p=parameters[a.element];return Array.isArray(p[0])?p[t]:p;
  });
  if(types.some(p=>!p)) throw new Error('Unsupported bonding environment');
  let q=graph.atoms.map(a=>a.charge||0);
  // Equivalent terminal heteroatoms in carboxylates/nitro groups share the seed.
  const assigned=new Set();
  graph.atoms.forEach((a,i)=>{
    if(!q[i] || assigned.has(i)) return;
    const equivalent=new Set([i]);
    neighbors[i].forEach(center=>{
      if(!pi[center]) return;
      neighbors[center].forEach(j=>{
        if(graph.atoms[j].element===a.element && neighbors[j].length===1 && neighbors[i].length===1 && (pi[j]||conjugated(j))) equivalent.add(j);
      });
    });
    const total=[...equivalent].reduce((sum,j)=>sum+q[j],0);
    equivalent.forEach(j=>{q[j]=total/equivalent.size;assigned.add(j)});
  });
  const h=indices.map(i=>m.getImplicitHydrogens(i));
  const hq=h.map(()=>0),ion=types.map((p,i)=>graph.atoms[i].element==='H'?20.02:p.reduce((a,b)=>a+b,0));
  const energy=(p,q)=>p[0]+q*(p[1]+p[2]*q);
  for(let iteration=0;iteration<12;iteration++) {
    const e=types.map((p,i)=>energy(p,q[i])),delta=q.map(()=>0),damp=2**(-iteration-1);
    graph.bonds.forEach(({from:i,to:j})=>{
      const dx=e[j]-e[i],transfer=dx/(dx>=0?ion[i]:ion[j])*damp;
      delta[i]+=transfer;delta[j]-=transfer;
    });
    h.forEach((count,i)=>{
      if(!count)return;
      const dx=energy(parameters.H,hq[i]/count)-e[i];
      const transfer=count*dx/(dx>=0?ion[i]:20.02)*damp;
      delta[i]+=transfer;hq[i]-=transfer;
    });
    q=q.map((v,i)=>v+delta[i]);
  }
  const atoms=graph.atoms.map((a,i)=>({...a,atomCharge:q[i],hydrogenCharge:hq[i],hydrogens:h[i],charge:q[i]+hq[i]}));
  if(atoms.some(a=>!Number.isFinite(a.charge))) throw new Error('Charge calculation did not converge');
  return atoms;
}
export async function calculatePartialCharges(graph) {
  const OCL=await loadOCL();
  return Promise.all(splitComponents(graph).map(async part=>{
    try {return {atoms:await componentCharges(part,OCL),bonds:part.bonds};}
    catch(error){return {atoms:part.atoms,bonds:part.bonds,unavailable:error.message};}
  }));
}
