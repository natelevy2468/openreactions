export const emptyAnimation = () => ({version:1,kind:'animation',initial:{atoms:[],bonds:[]},steps:[]});
export const clone = value => JSON.parse(JSON.stringify(value));
const valenceElectrons={H:1,C:4,N:5,O:6,F:7,Cl:7,Br:7,I:7};
export function components(scene) {
  const seen=new Set(),parts=[];
  for(const atom of scene.atoms){
    if(seen.has(atom.id))continue;
    const ids=[],stack=[atom.id];
    while(stack.length){const id=stack.pop();if(seen.has(id))continue;seen.add(id);ids.push(id);
      scene.bonds.filter(b=>b.from===id||b.to===id).forEach(b=>stack.push(b.from===id?b.to:b.from));}
    parts.push(ids);
  }
  return parts;
}
export function lonePairCount(scene,id){
  const a=scene.atoms.find(a=>a.id===id);if(!a)return 0;
  const order=scene.bonds.filter(b=>b.from===id||b.to===id).reduce((n,b)=>n+b.order,0);
  return Math.max(0,Math.floor(((valenceElectrons[a.element]??0)-(a.charge||0)-order-(a.hydrogens||0))/2));
}
export function validateScene(scene){
  const errors=[],ids=new Set(scene.atoms.map(a=>a.id)),pairs=new Set();
  if(ids.size!==scene.atoms.length)errors.push('Atom identifiers must be unique.');
  for(const b of scene.bonds){const key=[b.from,b.to].sort().join(':');
    if(!ids.has(b.from)||!ids.has(b.to)||b.from===b.to||pairs.has(key)||![1,2,3].includes(b.order))errors.push('Invalid or duplicate bond.');pairs.add(key);}
  for(const a of scene.atoms){
    const order=scene.bonds.filter(b=>b.from===a.id||b.to===a.id).reduce((n,b)=>n+b.order,0)+(a.hydrogens||0);
    const max=({H:1,C:4,N:3+(a.charge||0),O:2+(a.charge||0),F:1,Cl:1,Br:1,I:1})[a.element];
    if(max===undefined)errors.push(`${a.id}: ${a.element} is not supported in two-electron animation yet.`);
    else if(order>max || order<0)errors.push(`${a.id} (${a.element}) has invalid valence ${order}. Check the other electron arrows in this step.`);
  }
  return [...new Set(errors)];
}
export function proposeStep(before,flows,reactingIds=[]){
  if(!flows.length)throw new Error('Connect at least one electron-flow arrow first.');
  const scene=clone(before);scene.atoms.forEach(a=>{a.charge=a.charge||0;});
  const used=new Map(),changes=[];
  const atom=id=>{const a=scene.atoms.find(a=>a.id===id);if(!a)throw new Error('An arrow references a missing atom.');return a;};
  const changeBond=(from,to,delta)=>{
    let b=scene.bonds.find(b=>(b.from===from&&b.to===to)||(b.to===from&&b.from===to));
    if(!b){if(delta<0)throw new Error('No source bond exists.');b={id:`b:${[from,to].sort().join(':')}`,from,to,order:0};scene.bonds.push(b);}
    b.order+=delta;
  };
  for(const flow of flows){
    const {source,target}=flow;
    if(!source||!target)throw new Error('Every arrow needs a source and destination.');
    const key=`${source.kind}:${source.id}`,count=(used.get(key)||0)+1;used.set(key,count);
    if(source.kind==='pair'){
      if(count>lonePairCount(before,source.id))throw new Error(`${source.id} does not have that many available lone pairs.`);
      let to;
      if(target.kind==='atom')to=target.id;
      else if(target.kind==='bond'){
        const b=before.bonds.find(b=>b.id===target.id);
        if(!b||![b.from,b.to].includes(source.id))throw new Error('A lone pair can increase only a bond attached to its atom.');
        to=b.from===source.id?b.to:b.from;
      } else throw new Error('A lone pair must point to an atom or bond.');
      if(to===source.id)throw new Error('Select a different destination atom.');
      atom(source.id).charge++;atom(to).charge--;changeBond(source.id,to,1);
      changes.push(`${source.id} lone pair → ${source.id}–${to} bond`);
    } else if(source.kind==='bond'){
      const b=before.bonds.find(b=>b.id===source.id);
      if(!b||count>b.order)throw new Error('The source bond has no remaining electron pair.');
      if(target.kind!=='atom'||![b.from,b.to].includes(target.id))throw new Error('A breaking bond must deliver its pair to one of its own atoms.');
      const other=b.from===target.id?b.to:b.from;
      atom(target.id).charge--;atom(other).charge++;changeBond(b.from,b.to,-1);
      changes.push(`${b.from}–${b.to} bond → ${target.id} lone pair`);
    } else throw new Error('Choose a lone pair or bond as the source.');
  }
  scene.bonds=scene.bonds.filter(b=>b.order!==0);
  const errors=validateScene(scene);if(errors.length)throw new Error(errors.join(' '));
  const total=s=>s.atoms.reduce((n,a)=>n+(a.charge||0),0);
  if(total(before)!==total(scene))throw new Error('This step does not conserve charge.');
  // Move only selected reactant components. Internal bonds move rigidly.
  for(const ids of components(before)){
    if(!ids.some(id=>reactingIds.includes(id)))continue;
    const joining=flows.find(f=>f.source.kind==='pair'&&ids.includes(f.source.id)&&f.target.kind==='atom'&&!ids.includes(f.target.id));
    if(!joining)continue;
    const donor=atom(joining.source.id),target=atom(joining.target.id),dx=donor.x-target.x,dy=donor.y-target.y,len=Math.hypot(dx,dy)||1;
    const shift={x:target.x+dx/len*72-donor.x,y:target.y+dy/len*72-donor.y};
    scene.atoms.filter(a=>ids.includes(a.id)).forEach(a=>{a.x+=shift.x;a.y+=shift.y;});
  }
  // Detached leaving groups move outward after bond cleavage.
  const priorParts=components(before);
  for(const ids of components(scene)){
    const cleavage=flows.find(f=>f.source.kind==='bond'&&f.target.kind==='atom'&&ids.includes(f.target.id));
    if(!cleavage)continue;
    const old=before.bonds.find(b=>b.id===cleavage.source.id),other=old.from===cleavage.target.id?old.to:old.from;
    if(ids.includes(other)||!priorParts.some(p=>p.includes(other)&&p.includes(cleavage.target.id)))continue;
    const a=atom(cleavage.target.id),b=atom(other),length=Math.hypot(a.x-b.x,a.y-b.y)||1;
    const dx=(a.x-b.x)/length*75,dy=(a.y-b.y)/length*75;
    scene.atoms.filter(a=>ids.includes(a.id)).forEach(a=>{a.x+=dx;a.y+=dy;});
  }
  return {scene,changes};
}
export function carbonylExample(){
  const atoms=[['C1','C',430,280,0,0],['O1','O',430,195,0,0],['C2','C',350,325,0,3],['O2','O',510,325,0,0],['C3','C',590,280,0,3],['O3','O',235,190,-1,1]].map(([id,element,x,y,charge,hydrogens])=>({id,element,x,y,charge,hydrogens}));
  const bonds=[['B1','C1','O1',2],['B2','C1','C2',1],['B3','C1','O2',1],['B4','O2','C3',1]].map(([id,from,to,order])=>({id,from,to,order}));
  return {atoms,bonds};
}
export function exampleFlows(step=0){return step===0?[
  {source:{kind:'pair',id:'O3'},target:{kind:'atom',id:'C1'}},
  {source:{kind:'bond',id:'B1'},target:{kind:'atom',id:'O1'}},
]:[
  {source:{kind:'pair',id:'O1'},target:{kind:'bond',id:'B1'}},
  {source:{kind:'bond',id:'B3'},target:{kind:'atom',id:'O2'}},
];}
