import {drawingToScene} from './importDrawing.js';
import {sceneToDrawing} from './sceneDrawing.js';
import {hitTarget,targetPosition} from './render.js';
import {components} from './model.js';

export function drawingForStep(scene,flows=[]){
  const drawing=sceneToDrawing(scene);
  drawing.arrows=flows.map(f=>{
    const a=targetPosition(scene,f.source),b=targetPosition(scene,f.target);
    return {type:'curved',x1:a.x,y1:a.y,x2:b.x,y2:b.y,curveType:'curve1',direction:'ccw',electrons:2,animationFlow:f};
  });
  return drawing;
}
function attach(scene,p,source){
  const found=hitTarget(scene,p.x,p.y,source);
  if(found)return found;
  // A drawn arrow can start anywhere along a bond, not only its midpoint.
  let nearest=null,best=24;
  for(const b of scene.bonds){
    const a=scene.atoms.find(a=>a.id===b.from),z=scene.atoms.find(a=>a.id===b.to);
    const dx=z.x-a.x,dy=z.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    const d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
    if(d<best){best=d;nearest={kind:'bond',id:b.id};}
  }
  return nearest;
}
export async function readStepDrawing(drawing,previous){
  const scene=await drawingToScene(drawing,previous,{preserveCoordinates:true});
  const flows=(drawing.arrows||[]).map((arrow,i)=>{
    if(arrow.type!=='curved'||arrow.electrons===1)throw new Error(`Arrow ${i+1}: use a two-electron curved arrow for this mechanism.`);
    const source=attach(scene,{x:arrow.x1,y:arrow.y1},true),target=attach(scene,{x:arrow.x2,y:arrow.y2},false);
    if(!source||!target)throw new Error(`Arrow ${i+1}: place its start on a lone pair or bond and its tip on the receiving atom or bond.`);
    return {source,target};
  });
  const reactingIds=new Set();
  for(const f of flows)if(f.source.kind==='pair'&&f.target.kind==='atom'){
    const ids=components(scene).find(ids=>ids.includes(f.source.id))||[];
    if(!ids.includes(f.target.id))ids.forEach(id=>reactingIds.add(id));
  }
  return {scene,flows,reactingIds:[...reactingIds]};
}

export function continuationError(expected,actual){
  const atomKey=a=>JSON.stringify([a.element,a.charge||0,a.hydrogens||0]);
  if(expected.atoms.length!==actual.atoms.length||expected.atoms.some(a=>atomKey(a)!==atomKey(actual.atoms.find(b=>b.id===a.id)||{})))return 'The starting atoms and charges must match the previous product. Use the recommended structure to restore it.';
  const bonds=s=>s.bonds.map(b=>[[b.from,b.to].sort().join(':'),b.order].join('=')).sort().join('|');
  if(bonds(expected)!==bonds(actual))return 'The starting bonds must match the previous product. Use the recommended structure to restore it.';
  return null;
}
