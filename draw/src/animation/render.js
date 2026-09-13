import { components,lonePairCount } from './model.js';
const mix=(a,b,t)=>a+(b-a)*t;
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const lerp=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});
export function pairPosition(scene,id,index=0){
  const a=scene.atoms.find(a=>a.id===id);if(!a)return {x:0,y:0};
  const adjacent=scene.bonds.filter(b=>b.from===id||b.to===id).map(b=>scene.atoms.find(a=>a.id===(b.from===id?b.to:b.from)));
  let best=-1,angle=0;
  for(let i=0;i<24;i++){const theta=i*Math.PI/12;const clearance=adjacent.length?Math.min(...adjacent.map(p=>1-Math.cos(theta-Math.atan2(p.y-a.y,p.x-a.x)))):1;
    if(clearance>best){best=clearance;angle=theta;}}
  angle+=index*1.5;
  return {x:a.x+Math.cos(angle)*29,y:a.y+Math.sin(angle)*29};
}
export function targetPosition(scene,target){
  if(target.kind==='pair')return pairPosition(scene,target.id);
  if(target.kind==='bond'){const b=scene.bonds.find(b=>b.id===target.id);if(!b)return {x:0,y:0};const a=scene.atoms.find(a=>a.id===b.from),z=scene.atoms.find(a=>a.id===b.to);return {x:(a.x+z.x)/2,y:(a.y+z.y)/2};}
  return scene.atoms.find(a=>a.id===target.id)||{x:0,y:0};
}
function line(ctx,a,b,color='#273247',width=2.7,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
function pair(ctx,p,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#7750c5';for(const dx of [-3,3]){ctx.beginPath();ctx.arc(p.x+dx,p.y,2.2,0,Math.PI*2);ctx.fill();}ctx.restore();}
function bondEnds(scene,b,rail=0){
  const a=scene.atoms.find(a=>a.id===b.from),z=scene.atoms.find(a=>a.id===b.to);const len=Math.hypot(z.x-a.x,z.y-a.y)||1,ux=(z.x-a.x)/len,uy=(z.y-a.y)/len;
  const off=rail*7;
  return [{x:a.x+ux*18-uy*off,y:a.y+uy*18+ux*off},{x:z.x-ux*18-uy*off,y:z.y-uy*18+ux*off}];
}
export function renderMechanism(ctx,before,after=before,flows=[],progress=0,options={}){
  const {tags=true,reactingIds=[],selected,arrows=true,title=''}=options;
  ctx.clearRect(0,0,1000,600);ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,600);
  const motion=ease(progress/.65),phase=ease((progress-.15)/.75);
  const scene={atoms:before.atoms.map(a=>({...a,...lerp(a,after.atoms.find(b=>b.id===a.id)||a,motion)})),bonds:before.bonds};
  const map=new Map(scene.atoms.map(a=>[a.id,a]));
  const beforePairs=new Map(before.bonds.map(b=>[[b.from,b.to].sort().join(':'),b]));
  const afterPairs=new Map(after.bonds.map(b=>[[b.from,b.to].sort().join(':'),b]));
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
    for(let rail=0;rail<common;rail++){const [a,z]=bondEnds(scene,b,rail);line(ctx,a,z);}
    if(old?.order===next?.order)continue;
    const forming=(next?.order||0)>(old?.order||0);
    const flow=flows.find(f=>forming?f.source.kind==='pair'&&[b.from,b.to].includes(f.source.id)&&(f.target.id===(f.source.id===b.from?b.to:b.from)||f.target.id===next?.id):f.source.kind==='bond'&&f.source.id===old?.id);
    if(!flow){for(let rail=common;rail<(old?.order||0);rail++){const[a,z]=bondEnds(scene,b,rail);line(ctx,a,z,'#273247',2.7,1-phase);}continue;}
    const pairId=forming?flow.source.id:flow.target.id;
    const p=pairPosition({...scene,bonds:forming?before.bonds:after.bonds},pairId);
    const [a,z]=bondEnds(scene,b,common),left={x:p.x-3,y:p.y},right={x:p.x+3,y:p.y};
    const t=forming?phase:1-phase;
    line(ctx,lerp(left,a,t),lerp(right,z,t),'#7650c5',2.7,Math.min(1,t*2));
    if(t<.6){pair(ctx,lerp(p,{x:(a.x+z.x)/2,y:(a.y+z.y)/2},t),1-t/.6);}
  }
  for(const atom of scene.atoms){
    const oldCount=lonePairCount(before,atom.id),newCount=lonePairCount(after,atom.id);
    // Moving electron pairs are rendered by the bond morph above.
    for(let n=0;n<Math.min(oldCount,newCount);n++){
      const start=pairPosition({...scene,bonds:before.bonds},atom.id,n+(oldCount>newCount?1:0));
      const end=pairPosition({...scene,bonds:after.bonds},atom.id,n+(newCount>oldCount?1:0));
      pair(ctx,lerp(start,end,phase));
    }
    const changed=flows.some(f=>f.source.kind==='pair'&&f.source.id===atom.id||f.source.kind==='bond'&&f.target.id===atom.id);
    if(!changed)for(let n=Math.min(oldCount,newCount);n<oldCount;n++)pair(ctx,pairPosition(scene,atom.id,n),1-phase);
    const active=selected?.id===atom.id||reactingIds.includes(atom.id);
    if(active){ctx.strokeStyle='#ac8cde';ctx.lineWidth=2;ctx.beginPath();ctx.arc(atom.x,atom.y,23,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle='#243047';ctx.textAlign='center';ctx.font='19px sans-serif';
    const label=atom.element+(atom.hydrogens?'H'+(atom.hydrogens>1?String(atom.hydrogens).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]):''):'');
    ctx.fillText(label,atom.x,atom.y+6);
    const charge=progress>=.85?(after.atoms.find(a=>a.id===atom.id)?.charge||0):atom.charge;
    if(charge){ctx.font='14px sans-serif';ctx.fillStyle=charge<0?'#b23f65':'#4466b5';ctx.fillText((Math.abs(charge)>1?Math.abs(charge):'')+(charge>0?'+':'−'),atom.x+23,atom.y-11);}
    if(tags){ctx.font='10px sans-serif';ctx.fillStyle='#82738f';ctx.fillText(atom.id,atom.x,atom.y+22);}
  }
  ctx.textAlign='left';
  if(arrows && progress<.9)for(const [index,flow]of flows.entries()){
    const start=targetPosition(scene,flow.source),end=targetPosition(scene,flow.target),dx=end.x-start.x,dy=end.y-start.y;
    const control={x:(start.x+end.x)/2+dy*.35,y:(start.y+end.y)/2-dx*.35};
    ctx.strokeStyle='#9b7dd2';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(control.x,control.y,end.x,end.y);ctx.stroke();
    const angle=Math.atan2(end.y-control.y,end.x-control.x);ctx.fillStyle='#9b7dd2';ctx.beginPath();ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-10*Math.cos(angle-.4),end.y-10*Math.sin(angle-.4));ctx.lineTo(end.x-10*Math.cos(angle+.4),end.y-10*Math.sin(angle+.4));ctx.fill();
    ctx.font='11px sans-serif';ctx.fillText(String(index+1),control.x,control.y);
  }
  if(selected){const p=targetPosition(scene,selected);ctx.strokeStyle='#7650c5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,13,0,2*Math.PI);ctx.stroke();}
  if(title){ctx.fillStyle='#675b79';ctx.font='16px sans-serif';ctx.fillText(title,35,560);}
}
export function hitTarget(scene,x,y,source=false){
  const distance=p=>Math.hypot(p.x-x,p.y-y);
  if(source){const pairs=scene.atoms.filter(a=>lonePairCount(scene,a.id)>0).map(a=>({kind:'pair',id:a.id}));const found=pairs.find(p=>distance(targetPosition(scene,p))<16);if(found)return found;}
  const atom=scene.atoms.find(a=>distance(a)<22);if(atom)return {kind:source?'pair':'atom',id:atom.id};
  const bond=scene.bonds.find(b=>distance(targetPosition(scene,{kind:'bond',id:b.id}))<18);return bond?{kind:'bond',id:bond.id}:null;
}
