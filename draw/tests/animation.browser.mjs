import assert from 'node:assert/strict';
export async function checkAnimations({call,evaluate,until,base,capture}){
  const click=label=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(label)}).click()`);
  const read=()=>evaluate(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc`);
  await call('Page.navigate',{url:base});
  await until(`!!document.querySelector('#account-slot button') && document.body.innerText.includes('On this device')`);
  await evaluate(`document.querySelector('#new-menu-button').click()`);
  assert.equal(await evaluate(`document.querySelector('#new-menu').hidden`),false);
  assert(await evaluate(`document.querySelector('#new-drawing-link').href.includes('/draw/?')`));
  const animationUrl=await evaluate(`document.querySelector('#new-animation-link').href`);
  assert(animationUrl.includes('/animate/'));
  await capture('new-creation-menu.png');
  await call('Page.navigate',{url:animationUrl});
  await until(`document.querySelector('.animation-editor') && document.body.innerText.includes('Saved on this device')`);
  await click('Carbonyl example');
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.initial?.atoms?.length===6`);
  const initial=await read();
  const canvasClick=async(x,y)=>{
    const p=await evaluate(`(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.left+${x}/1000*r.width,y:r.top+${y}/600*r.height};})()`);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  };
  await click('Reacting species');await canvasClick(235,190);await click('Connect electron flow');
  await canvasClick(264,190);await canvasClick(430,280);
  await click('Propose next structure');
  await until(`document.body.innerText.includes('invalid valence')`);
  await canvasClick(430,237.5);await canvasClick(430,195);
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.draftFlows.length===2`);
  await click('Propose next structure');
  await until(`document.body.innerText.includes('Accept intermediate')`);
  await capture('animation-proposal.png');
  assert.equal((await read()).steps.length,0,'Unaccepted proposal was saved as a step');
  await click('Accept intermediate');
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.steps.length===1`);
  await click('Use example arrows');await click('Propose next structure');await click('Accept intermediate');
  await until(`JSON.parse(localStorage.getItem('openreactions.draft.local')).doc.steps.length===2`);
  const doc=await read();assert.equal(doc.steps[1].after.atoms.find(a=>a.id==='O2').charge,-1);
  assert.deepEqual(doc.initial,initial.initial);
  const local=await evaluate(`new URL(location.href).searchParams.get('local')`);
  await call('Page.reload');await until(`document.querySelector('.animation-editor') && document.body.innerText.includes('Saved on this device')`);
  assert.equal((await read()).steps.length,2);
  await click('Step 1');await click('Play');
  await until(`Number(document.querySelector('[aria-label="Animation progress"]').value)>.05`);
  await click('Pause');await capture('animation-playback.png');
  await evaluate(`window.__animationExports=[];const original=URL.createObjectURL;URL.createObjectURL=function(blob){window.__animationExports.push(blob);return original.call(this,blob)};HTMLAnchorElement.prototype.click=function(){};`);
  await click('Export GIF');
  for(let i=0;i<120;i++){if(await evaluate(`window.__animationExports.length>0`))break;await new Promise(r=>setTimeout(r,250));}
  const gif=await evaluate(`(async()=>{const b=window.__animationExports[0];return b?{type:b.type,size:b.size,header:new TextDecoder().decode((await b.arrayBuffer()).slice(0,6))}:null})()`);
  assert(gif&&gif.type==='image/gif'&&gif.size>1000&&gif.header==='GIF89a','Invalid GIF export');
  // Faster video export to keep this integration test short.
  await evaluate(`(()=>{const select=document.querySelector('.animation-transport select');select.value='2';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await click('Export video');
  for(let i=0;i<100;i++){if(await evaluate(`window.__animationExports.length>1`))break;await new Promise(r=>setTimeout(r,200));}
  assert(await evaluate(`window.__animationExports[1]?.type==='video/webm' && window.__animationExports[1]?.size>1000`),'Video export missing');
  await call('Page.navigate',{url:base});await until(`!!document.querySelector('#account-slot button') && document.body.innerText.includes('On this device')`);await evaluate(`document.querySelector('#nav-animations').click()`);
  await capture('animation-library-debug.png');
  await until(`!!document.querySelector('.drawing-card[href*="${local}"]')`);
  assert(await evaluate(`document.querySelector('.drawing-card[href*="${local}"]').href.includes('kind=animation')`));
  await capture('animation-library.png');
  console.log('PASS: Animation proposal/review, two-step mechanism, playback, save/reload, GIF/WebM export, and separate library');
}
