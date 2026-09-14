import {getAtomElectronPositions,renderCharge,renderLonePairs} from '../rendering/LonePairRenderer.js';
import {renderMoleculePreview} from '../rendering/MoleculePreview.js';
import {sceneToDrawing} from './sceneDrawing.js';
import {renderArrow} from '../rendering/ArrowRenderer.js';
import { components,lonePairCount } from './model.js';
const mix=(a,b,t)=>a+(b-a)*t;
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const lerp=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
let measurementContext;
function electronLayout(scene,id){
  const a=scene.atoms.find(a=>a.id===id);if(!a)return {lonePairPositions:[],chargePosition:null};
  const drawing=sceneToDrawing(scene);
  const atom=drawing.vertexAtoms[`${a.x.toFixed(2)},${a.y.toFixed(2)}`]||{symbol:a.element,lonePairs:0,charge:0};
  measurementContext ||= document.createElement('canvas').getContext('2d');
  return getAtomElectronPositions(measurementContext,a,drawing.segments,drawing.vertexAtoms,atom);
}
export function pairPosition(scene,id,index=0){
  return electronLayout(scene,id).lonePairPositions[index]||scene.atoms.find(a=>a.id===id)||{x:0,y:0};
}
export function sceneViewport(scene){
  if(!scene?.atoms.length)return {scale:1,x:0,y:0};
  const xs=scene.atoms.map(a=>a.x),ys=scene.atoms.map(a=>a.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(2,1000/(maxX-minX+160),600/(maxY-minY+160));
  return {scale,x:500-(minX+maxX)/2*scale,y:300-(minY+maxY)/2*scale};
}
export function targetPosition(scene,target){
  if(target.kind==='pair')return pairPosition(scene,target.id,target.pairIndex||0);
  if(target.kind==='bond'){const b=scene.bonds.find(b=>b.id===target.id);if(!b)return {x:0,y:0};const a=scene.atoms.find(a=>a.id===b.from),z=scene.atoms.find(a=>a.id===b.to);return {x:(a.x+z.x)/2,y:(a.y+z.y)/2};}
  return scene.atoms.find(a=>a.id===target.id)||{x:0,y:0};
}
function line(ctx,a,b,color='#000',width=2.7,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
function pair(ctx,p,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#000';for(const dx of [-5,5]){ctx.beginPath();ctx.arc(p.x+dx,p.y,3,0,Math.PI*2);ctx.fill();}ctx.restore();}
function bondEnds(scene,b,rail=0){
  const a=scene.atoms.find(a=>a.id===b.from),z=scene.atoms.find(a=>a.id===b.to);const len=Math.hypot(z.x-a.x,z.y-a.y)||1,ux=(z.x-a.x)/len,uy=(z.y-a.y)/len;
  const off=rail*7;
  return [{x:a.x+ux*(a.element==='C'?0:22)-uy*off,y:a.y+uy*(a.element==='C'?0:22)+ux*off},{x:z.x-ux*(z.element==='C'?0:22)-uy*off,y:z.y-uy*(z.element==='C'?0:22)+ux*off}];
}
export function renderMechanism(ctx,before,after=before,flows=[],progress=0,options={}){
  const {tags=false,reactingIds=[],selected,arrows=true,title='',background='#fff'}=options;
  ctx.clearRect(0,0,1000,600);ctx.fillStyle=background;ctx.fillRect(0,0,1000,600);
  const motion=ease(progress/.65),phase=ease((progress-.15)/.75);
  const scene={atoms:before.atoms.map(a=>({...a,...lerp(a,after.atoms.find(b=>b.id===a.id)||a,motion)})),bonds:before.bonds};
  const map=new Map(scene.atoms.map(a=>[a.id,a]));
  const beforePairs=new Map(before.bonds.map(b=>[[b.from,b.to].sort().join(':'),b]));
  const afterPairs=new Map(after.bonds.map(b=>[[b.from,b.to].sort().join(':'),b]));
  const stableBonds=progress===0?before.bonds:progress===1?after.bonds:before.bonds.map(b=>{
    const next=after.bonds.find(n=>[n.from,n.to].sort().join(':')===[b.from,b.to].sort().join(':'));
    return {...b,order:Math.min(b.order,next?.order||0)};
  }).filter(b=>b.order>0);
  const visibleAtoms=scene.atoms.map(a=>({...a,charge:progress>=.85?(after.atoms.find(n=>n.id===a.id)?.charge||0):a.charge}));
  const drawing=sceneToDrawing({atoms:visibleAtoms,bonds:stableBonds},{electrons:false});
  Object.values(drawing.vertexAtoms).forEach(a=>{a.charge=0;});
  renderMoleculePreview(ctx,{vertices:drawing.vertices,bonds:drawing.segments,atoms:drawing.vertexAtoms},{x:0,y:0},{bonds:'#000',text:'#000',canvasBackground:background});
  if(tags)for(const [i,ids]of components(before).entries()){
    const atoms=scene.atoms.filter(a=>ids.includes(a.id)),x=Math.min(...atoms.map(a=>a.x))-48,y=Math.min(...atoms.map(a=>a.y))-63;
    ctx.fillStyle=ids.some(id=>reactingIds.includes(id))?'#7650c5':'#8c849d';ctx.font='12px sans-serif';ctx.fillText(`Species ${i+1}${ids.some(id=>reactingIds.includes(id))?' · moving':''}`,x,y);
  }
  for(const key of new Set([...beforePairs.keys(),...afterPairs.keys()])){
    const old=beforePairs.get(key),next=afterPairs.get(key),b=old||next;
    const common=Math.min(old?.order||0,next?.order||0);
    if(tags){const a=map.get(b.from),z=map.get(b.to),length=Math.hypot(z.x-a.x,z.y-a.y)||1;
      ctx.fillStyle='#9989ae';ctx.font='10px sans-serif';ctx.fillText(b.id,(a.x+z.x)/2-(z.y-a.y)/length*13,(a.y+z.y)/2+(z.x-a.x)/length*13);
    }
    if(progress===0||progress===1)continue;
    if(old?.order===next?.order)continue;
    const forming=(next?.order||0)>(old?.order||0);
    const flow=flows.find(f=>forming?f.source.kind==='pair'&&[b.from,b.to].includes(f.source.id)&&(f.target.id===(f.source.id===b.from?b.to:b.from)||f.target.id===next?.id):f.source.kind==='bond'&&f.source.id===old?.id);
    if(!flow){for(let rail=common;rail<(old?.order||0);rail++){const[a,z]=bondEnds(scene,b,rail);line(ctx,a,z,'#000',2.7,1-phase);}continue;}
    const pairId=forming?flow.source.id:flow.target.id;
    const p=pairPosition({...scene,bonds:forming?before.bonds:after.bonds},pairId);
    const [a,z]=bondEnds(scene,b,common),left={x:p.x-3,y:p.y},right={x:p.x+3,y:p.y};
    const t=forming?phase:1-phase;
    line(ctx,lerp(left,a,t),lerp(right,z,t),'#000',2.7,Math.min(1,t*2));
    if(t<.6){pair(ctx,lerp(p,{x:(a.x+z.x)/2,y:(a.y+z.y)/2},t),1-t/.6);}
  }
  for(const atom of scene.atoms){
    const oldCount=lonePairCount(before,atom.id),newCount=lonePairCount(after,atom.id);
    if(progress===0||progress===1){
      const target=progress===0?before:after;
      renderLonePairs(ctx,electronLayout(target,atom.id).lonePairPositions,{x:0,y:0},{bonds:'#000',canvasBackground:background});
    }else{
      for(let n=0;n<Math.min(oldCount,newCount);n++){
        const start=pairPosition({...scene,bonds:before.bonds},atom.id,n+(oldCount>newCount?1:0));
        const end=pairPosition({...scene,bonds:after.bonds},atom.id,n+(newCount>oldCount?1:0));
        pair(ctx,lerp(start,end,phase));
      }
    }
    const chargeScene=progress>=.85?after:before;
    const layout=electronLayout({...scene,bonds:chargeScene.bonds,atoms:scene.atoms.map(a=>({...a,charge:chargeScene.atoms.find(n=>n.id===a.id)?.charge||0}))},atom.id);
    renderCharge(ctx,layout.chargePosition,{x:0,y:0},{text:'#000',canvasBackground:background});
    const active=selected?.id===atom.id||reactingIds.includes(atom.id);
    if(active){ctx.strokeStyle='#ac8cde';ctx.lineWidth=2;ctx.beginPath();ctx.arc(atom.x,atom.y,23,0,Math.PI*2);ctx.stroke();}
    if(tags){ctx.font='10px sans-serif';ctx.fillStyle='#82738f';ctx.fillText(atom.id,atom.x,atom.y+22);}
  }
  ctx.textAlign='left';
  if(arrows && progress<.9)for(const [index,flow]of flows.entries()){
    const start=targetPosition(scene,flow.source),end=targetPosition(scene,flow.target),dx=end.x-start.x,dy=end.y-start.y;
    renderArrow(ctx,{type:'curved',x1:start.x,y1:start.y,x2:end.x,y2:end.y,curveType:'curve1',direction:'ccw',controlOffset:-Math.hypot(dx,dy)*.28,electrons:2},{x:0,y:0},{bonds:'#000',text:'#000'},false);

  }
  if(selected){const p=targetPosition(scene,selected);ctx.strokeStyle='#7650c5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,13,0,2*Math.PI);ctx.stroke();}
  if(title){ctx.fillStyle='#675b79';ctx.font='16px sans-serif';ctx.fillText(title,35,560);}
}
export function hitTarget(scene,x,y,source=false){
  const distance=p=>Math.hypot(p.x-x,p.y-y);
  if(source){const pairs=scene.atoms.flatMap(a=>Array.from({length:lonePairCount(scene,a.id)},(_,pairIndex)=>({kind:'pair',id:a.id,pairIndex})));const found=pairs.find(p=>distance(targetPosition(scene,p))<16);if(found)return found;}
  const atom=scene.atoms.find(a=>distance(a)<22);if(atom)return {kind:source?'pair':'atom',id:atom.id};
  const bond=scene.bonds.find(b=>distance(targetPosition(scene,{kind:'bond',id:b.id}))<18);return bond?{kind:'bond',id:bond.id}:null;
}
