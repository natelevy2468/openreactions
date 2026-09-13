import assert from 'node:assert/strict';
export async function checkEditorInteractions({call,evaluate,until,base,capture}) {
  let sequence=0;
  const openDoc=async doc=>{
    const id=`44444444-4444-4444-8444-${String(++sequence).padStart(12,'0')}`;
    await evaluate(`localStorage.setItem('openreactions.localDocument.${id}',${JSON.stringify(JSON.stringify({title:'Interaction '+sequence,updatedAt:new Date().toISOString(),doc:{version:1,vertices:[],segments:[],vertexAtoms:{},arrows:[],newmanInstances:[],offset:{x:0,y:0},scale:1,...doc}}))})`);
    await call('Page.navigate',{url:`${base}/draw/?local=${id}`});
    await until(`document.body?.innerText.includes('Interaction ${sequence}') && !!document.querySelector('canvas')`);
    await until(`document.body?.innerText.includes('Saved on this device')`);
    return id;
  };
  const read=()=>evaluate(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc`);
  const screen=async(x,y)=>evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();const d=JSON.parse(localStorage.getItem('openreactions.draft.local')).doc;return {x:r.left+(${x}+d.offset.x)*d.scale,y:r.top+(${y}+d.offset.y)*d.scale};})()`);
  const move=async(x,y)=>{await call('Input.dispatchMouseEvent',{type:'mouseMoved',...await screen(x,y)});};
  const click=async(x,y)=>{const p=await screen(x,y);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});};
  const drag=async(a,b)=>{await move(a.x,a.y);await call('Input.dispatchMouseEvent',{type:'mousePressed',...await screen(a.x,a.y),button:'left',clickCount:1});for(let n=1;n<=4;n++)await move(a.x+(b.x-a.x)*n/4,a.y+(b.y-a.y)*n/4);await call('Input.dispatchMouseEvent',{type:'mouseReleased',...await screen(b.x,b.y),button:'left',clickCount:1});};
  const pointer=()=>evaluate(`document.querySelector('[title="Select / move (M or Esc)"]').click()`);
  const tools=()=>evaluate(`Array.from(document.querySelectorAll('.editor-menu-trigger')).find(b=>b.textContent.startsWith('Tools')).click()`);

  await openDoc({});
  assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Curved arrow shortcuts"] > button[aria-pressed]').length`),4);
  await evaluate(`document.querySelector('[aria-label="More curved arrows"]').click()`);
  await until(`!!document.querySelector('[role="dialog"][aria-label="More curved arrows"]')`);
  assert.equal(await evaluate(`document.querySelectorAll('.curved-arrow-options button').length`),12);
  await capture('curved-arrow-picker.png');
  await evaluate(`document.querySelector('[aria-label="Shallow CW · single electron (fishhook)"]').click()`);
  await click(180,220);await click(340,220);
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.arrows.length===1`);
  let fish=(await read()).arrows[0];assert.equal(fish.electrons,1);assert.equal(fish.direction,'cw');assert.equal(fish.controlOffset,40);
  await call('Page.reload');await until(`document.body?.innerText.includes('Saved on this device')`);
  assert.equal((await read()).arrows[0].electrons,1);
  await pointer();await click(180,220);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'c',code:'KeyC',modifiers:2});
  await click(450,350);
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.arrows.length===2`);
  assert((await read()).arrows.every(a=>a.electrons===1 && a.curveType==='curve3'));
  console.log('PASS: Four curved-arrow shortcuts, twelve expanded choices, and fishhook drawing/reload/copy');

  await openDoc({});
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'r',code:'KeyR'});
  await click(300,250);await click(352,340);
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.segments.length===11`);
  const fused=await read();
  assert.equal(fused.vertices.length,10);
  assert.equal(fused.segments.filter(b=>b.bondOrder===2).length,5);
  await pointer();await move(600,500);await capture('fused-benzene.png');
  console.log('PASS: Adjacent benzene placement shares one edge and produces five double bonds');

  const chargeVertices=[{x:300,y:250},{x:300,y:190},{x:240,y:280},{x:360,y:280},{x:570,y:250},{x:630,y:250},{x:780,y:250}];
  const chargeBonds=[[0,1,2],[0,2,1],[0,3,1],[4,5,1]].map(([i,j,bondOrder])=>({x1:chargeVertices[i].x,y1:chargeVertices[i].y,x2:chargeVertices[j].x,y2:chargeVertices[j].y,bondOrder}));
  await openDoc({vertices:chargeVertices,segments:chargeBonds,vertexAtoms:{'300.00,190.00':{symbol:'O'},'630.00,250.00':{symbol:'F'},'780.00,250.00':{symbol:'N',charge:1}}});
  await evaluate(`document.querySelector('[aria-label="View"]').click()`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Local charge').click()`);
  await until(`document.querySelector('[aria-label="Local charge legend"]')?.innerText.includes('Estimated partial charge')`);
  await move(900,500);await capture('local-charge.png');
  const aura=await evaluate(`(()=>{const c=document.querySelector('canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let red=0,blue=0;for(let i=0;i<p.length;i+=4){if(p[i]-p[i+2]>12)red++;if(p[i+2]-p[i]>12)blue++;}return {red,blue}})()`);
  assert(aura.red>100&&aura.blue>100,'Expected both negative and positive aura regions');
  assert.equal((await read()).segments.length,4);
  await evaluate(`document.querySelector('[aria-label="Hide local charge"]').click()`);
  await until(`!document.querySelector('[aria-label="Local charge legend"]')`);
  console.log('PASS: Local charge view shows red/blue regions on multiple molecules and toggles without editing');

  const problemVertices=[{x:300,y:250},...Array.from({length:5},(_,i)=>({x:300+60*Math.cos(i*2*Math.PI/5),y:250+60*Math.sin(i*2*Math.PI/5)}))];
  await openDoc({vertices:problemVertices,segments:problemVertices.slice(1).map(v=>({x1:300,y1:250,x2:v.x,y2:v.y,bondOrder:1}))});
  await tools();
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Check chemistry').click()`);
  await until(`document.body.innerText.includes('bond order total 5')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.startsWith('1. C:')).click()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await capture('chemistry-highlights.png');
  assert.equal((await read()).segments.length,5,'Checking must not edit bonds');
  await tools();await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Hide chemistry check').click()`);
  await until(`!document.body.innerText.includes('bond order total 5')`);
  console.log('PASS: Chemistry problems can be located on canvas and diagnostics dismissed without editing');

  await openDoc({arrows:[{type:'equilibrium',x:300,y:250,length:160,angle:0}]});await pointer();
  await drag({x:220,y:250},{x:180,y:280});
  await until(`Math.abs(JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.arrows[0].x-280)<.1`);
  let a=(await read()).arrows[0];
  assert(Math.abs(a.x+Math.cos(a.angle)*a.length/2-380)<.1,'Equilibrium opposite endpoint shifted');
  await drag({x:a.x,y:a.y},{x:a.x+50,y:a.y+35});
  await until(`Math.abs(JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.arrows[0].x-330)<.1`);
  console.log('PASS: Equilibrium endpoint resizing and body dragging use the visible geometry');

  const vertices=Array.from({length:6},(_,i)=>({x:+(300+60*Math.cos(i*Math.PI/3)).toFixed(2),y:+(250+60*Math.sin(i*Math.PI/3)).toFixed(2)}));
  const segments=vertices.map((v,i)=>({x1:v.x,y1:v.y,x2:vertices[(i+1)%6].x,y2:vertices[(i+1)%6].y,bondOrder:i%2?1:2}));
  await openDoc({vertices,segments,vertexAtoms:{'360.00,250.00':{symbol:'N',charge:1}}});await pointer();
  const midpoint={x:345,y:275.98};await click(midpoint.x,midpoint.y);
  await drag(midpoint,{x:midpoint.x+80,y:midpoint.y+40});
  await until(`Math.abs(JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.vertices[0].x-440)<.1`);
  const moved=await read();assert.equal(moved.vertexAtoms['440.00,290.00'].charge,1);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'c',code:'KeyC',modifiers:2});
  await click(750,500);
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.segments.length===12`);
  const pasted=await read();assert.equal(pasted.vertices.length,12);assert.equal(pasted.segments.filter(b=>b.bondOrder===2).length,6);
  const delta={x:pasted.vertices[6].x-pasted.vertices[0].x,y:pasted.vertices[6].y-pasted.vertices[0].y};
  for(let i=0;i<6;i++) {const p=pasted.segments[i],q=pasted.segments[i+6];assert(Math.abs(q.x1-p.x1-delta.x)<.01 && Math.abs(q.y2-p.y2-delta.y)<.01);assert.equal(q.bondOrder,p.bondOrder);}
  assert.equal(Object.values(pasted.vertexAtoms).filter(a=>a.symbol==='N'&&a.charge===1).length,2);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'z',code:'KeyZ',modifiers:2});
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.segments.length===6`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'z',code:'KeyZ',modifiers:10});
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.segments.length===12`);
  console.log('PASS: Select by bond, continuous drag, copy/paste, undo and redo preserve ring bonds and atom metadata');

  await openDoc({vertices:[{x:180,y:200},{x:240,y:200},{x:450,y:200},{x:510,y:200}],segments:[{x1:180,y1:200,x2:240,y2:200,bondOrder:1},{x1:450,y1:200,x2:510,y2:200,bondOrder:1}],vertexAtoms:{'510.00,200.00':{symbol:'O'}}});
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Info').click()`);
  await until(`document.querySelector('[data-info-dropdown]').innerText.includes('32.04 g/mol')`);
  await click(210,200);
  await until(`document.querySelector('[data-info-dropdown]').innerText.includes('30.07 g/mol')`);
  assert.equal((await read()).segments.length,2,'Info inspection edited the molecule');
  console.log('PASS: Info defaults to the latest molecule and switches between disconnected molecules without editing them');

  await openDoc({});await tools();
  await until(`!!document.querySelector('[aria-label="Tools"] input[type="checkbox"]')`);
  await evaluate(`document.querySelector('[aria-label="Tools"] input[type="checkbox"]').click();document.querySelector('[aria-label="Close Tools"]').click()`);
  await click(180,200);await move(277,231);await click(277,231);
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.segments.length===1`);
  const b=(await read()).segments[0];assert.equal(b.x2-b.x1,97);assert.equal(b.y2-b.y1,31);
  await evaluate(`document.querySelector('[data-settings-dropdown] button').click()`);
  await evaluate(`Array.from(document.querySelectorAll('[role="tab"]')).find(b=>b.textContent==='History').click()`);
  await until(`document.body.innerText.includes('Checkpoints on this device')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='About').click()`);
  await until(`!!document.querySelector('a[href="mailto:sick96096@gmail.com"]')`);
  assert.equal(await evaluate(`document.body.textContent.includes('925-808-9441')`),false);
  console.log('PASS: Free placement retains irregular geometry, History is in Settings, and About uses the requested email');
}
