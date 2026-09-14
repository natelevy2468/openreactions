import {lonePairCount} from './model.js';
export function sceneToDrawing(scene,{electrons=true}={}){
  const vertices=scene.atoms.map(a=>({x:a.x,y:a.y,animationAtomId:a.id}));
  const atomMap=new Map(scene.atoms.map(a=>[a.id,a]));
  const segments=scene.bonds.map(b=>{
    const a=atomMap.get(b.from),z=atomMap.get(b.to);
    return {x1:a.x,y1:a.y,x2:z.x,y2:z.y,bondOrder:b.order,animationBondId:b.id};
  });
  const vertexAtoms={};
  scene.atoms.forEach(a=>{
    // Drawing payloads store electron dots; the mechanism model counts pairs.
    const lonePairs=electrons?2*lonePairCount(scene,a.id):0;
    if(a.element!=='C'||a.charge||lonePairs||!scene.bonds.some(b=>b.from===a.id||b.to===a.id))
      vertexAtoms[`${a.x.toFixed(2)},${a.y.toFixed(2)}`]={symbol:a.element,implicitH:a.hydrogens||0,charge:a.charge||0,lonePairs,_fixedHydrogens:true};
  });
  return {version:1,vertices,segments,vertexAtoms,arrows:[],newmanInstances:[],offset:{x:0,y:0},scale:1};
}
