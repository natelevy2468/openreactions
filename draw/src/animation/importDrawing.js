import { buildMoleculeGraph } from '../chemistry/moleculeGraph.js';
import { graphToOCLMolecule } from '../chemistry/exportStructure.js';
import { loadOCL } from '../chemistry/ocl.js';
import { validateScene } from './model.js';
export async function drawingToScene(drawing){
  const graph=buildMoleculeGraph(drawing),OCL=await loadOCL();
  if(graph.bonds.some(b=>b.bondType))throw new Error('Stereochemical bonds are not supported in animation yet. Use a drawing with ordinary 2D bonds.');
  if(!graph.atoms.length)throw new Error('This drawing has no atoms.');
  const {molecule,warnings}=graphToOCLMolecule(OCL,graph);
  if(warnings.length||molecule.getAllAtoms()!==graph.atoms.length)throw new Error('Expand abbreviations before importing an animation.');
  molecule.ensureHelperArrays(OCL.Molecule.cHelperRings);
  const counts={};
  const atoms=graph.atoms.map(a=>{
    if(a.radical)throw new Error('Single-electron mechanisms are not supported yet.');
    let index=-1;
    for(let j=0;j<molecule.getAllAtoms();j++)if(Math.hypot(molecule.getAtomX(j)-a.x,molecule.getAtomY(j)+a.y)<.01)index=j;
    if(index<0)throw new Error('Could not map an atom.');
    counts[a.element]=(counts[a.element]||0)+1;
    return {id:a.element+counts[a.element],element:a.element,x:a.x,y:a.y,charge:a.charge||0,hydrogens:molecule.getImplicitHydrogens(index)};
  });
  const bonds=graph.bonds.map((b,i)=>({id:`B${i+1}`,from:atoms[b.from].id,to:atoms[b.to].id,order:b.order}));
  const scene={atoms,bonds},errors=validateScene(scene);if(errors.length)throw new Error(errors.join(' '));
  const minX=Math.min(...atoms.map(a=>a.x)),maxX=Math.max(...atoms.map(a=>a.x)),minY=Math.min(...atoms.map(a=>a.y)),maxY=Math.max(...atoms.map(a=>a.y));
  const scale=Math.min(1,650/Math.max(1,maxX-minX),350/Math.max(1,maxY-minY));
  atoms.forEach(a=>{a.x=450+(a.x-(minX+maxX)/2)*scale;a.y=280+(a.y-(minY+maxY)/2)*scale;});
  return scene;
}
