import React,{useState,useEffect,useRef,useCallback} from 'react';
import {emptyAnimation,clone,carbonylExample,exampleFlows,proposeStep,components,lonePairCount,validateScene} from './model.js';
import {renderMechanism,hitTarget} from './render.js';
import {drawingToScene} from './importDrawing.js';
import {exportAnimation,downloadBlob} from './export.js';
import {useAuth} from '../hooks/useAuth.js';
import {useDocumentSync} from '../hooks/useDocumentSync.js';
import {listLocalDocuments} from '../lib/localLibrary.js';
import {listDrawings,fetchDrawing} from '../lib/documents.js';
import {smilesToGraph} from '../chemistry/importStructure.js';
import {graphToDrawing} from '../chemistry/graphToDrawing.js';
import './animation.css';

export default function AnimationEditor(){
  const [doc,setDoc]=useState(emptyAnimation),[stepIndex,setStepIndex]=useState(0),[proposal,setProposal]=useState(null);
  const [mode,setMode]=useState('connect'),[source,setSource]=useState(null),[message,setMessage]=useState(''),[tags,setTags]=useState(true);
  const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
  const [smiles,setSmiles]=useState(''),[imports,setImports]=useState([]),[importId,setImportId]=useState('');
  const [busy,setBusy]=useState(false),[exportProgress,setExportProgress]=useState(null);
  const canvas=useRef(null),undo=useRef([]),redo=useRef([]),drag=useRef(null),controller=useRef(null);
  const auth=useAuth();
  const applyDoc=useCallback(next=>{setDoc(next?.kind==='animation'?next:emptyAnimation());setStepIndex(next?.steps?.length||0);setProposal(null);setProgress(0);setPlaying(false);},[]);
  const captureThumbnail=useCallback(()=>canvas.current?.toDataURL('image/png')||null,[]);
  const sync=useDocumentSync({doc,applyDoc,userId:auth.user?.id||null,authLoading:auth.loading,captureThumbnail,emptyDocument:emptyAnimation,defaultTitle:'Untitled animation',documentKind:'animation'});
  const viewing=stepIndex<doc.steps.length;
  const before=viewing?(stepIndex?doc.steps[stepIndex-1].after:doc.initial):(doc.steps.at(-1)?.after||doc.initial);
  const savedStep=viewing?doc.steps[stepIndex]:null;
  const flows=savedStep?.flows||doc.draftFlows||[];
  const after=savedStep?.after||proposal?.scene||before;
  const reactingIds=savedStep?.reactingIds||doc.reactingIds||[];
  const mutate=next=>{undo.current.push(clone(doc));redo.current=[];setDoc(next);setProposal(null);setPlaying(false);setProgress(0);setSource(null);setMessage('');};
  const changeDraft=(key,value)=>mutate({...doc,[key]:value});
  const stop=()=>{setPlaying(false);setProgress(0);};
  useEffect(()=>{let cancelled=false;
    const local=listLocalDocuments().filter(d=>d.doc?.kind!=='animation').map(d=>({id:'local:'+d.id,title:d.title,doc:d.doc}));setImports(local);
    if(auth.user)listDrawings(100).then(({data})=>{if(!cancelled)setImports([...local,...(data||[]).map(d=>({id:'cloud:'+d.id,title:d.title}))]);});
    return()=>{cancelled=true};
  },[auth.user]);
  useEffect(()=>{
    if(!canvas.current)return;
    renderMechanism(canvas.current.getContext('2d'),before,after,flows,progress,{tags,reactingIds,selected:source,title:savedStep?.title|| (proposal?'Proposed intermediate':'Connect electron-flow arrows to define the next step')});
  },[before,after,flows,progress,tags,reactingIds,source,savedStep,proposal]);
  useEffect(()=>{
    if(!playing)return;
    let frame,last=performance.now(),elapsed=progress*6/speed;
    const tick=now=>{elapsed+=(now-last)/1000;last=now;setProgress(Math.min(1,elapsed*speed/6));
      if(elapsed>=7/speed){setPlaying(false);if(viewing&&stepIndex+1<doc.steps.length){setStepIndex(i=>i+1);setProgress(0);setTimeout(()=>setPlaying(true),0);}return;}
      frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,speed,stepIndex]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const onUndo=()=>{if(!undo.current.length)return;redo.current.push(clone(doc));const next=undo.current.pop();setDoc(next);setStepIndex(next.steps.length);setProposal(null);stop();};
  const onRedo=()=>{if(!redo.current.length)return;undo.current.push(clone(doc));const next=redo.current.pop();setDoc(next);setStepIndex(next.steps.length);setProposal(null);stop();};
  const point=e=>{const box=canvas.current.getBoundingClientRect();return {x:(e.clientX-box.left)*1000/box.width,y:(e.clientY-box.top)*600/box.height};};
  const connect=target=>{
    if(!target)return;
    if(!source){if(target.kind==='pair'&&lonePairCount(before,target.id)===0){setMessage('That atom has no available lone pair. Select a bond instead.');return;}setSource(target);setMessage('Now select the receiving atom or bond.');}
    else{mutate({...doc,draftFlows:[...flows,{source,target}]});}
  };
  const canvasDown=e=>{
    if(viewing||proposal||playing||!sync.ready)return;
    const p=point(e),target=hitTarget(before,p.x,p.y,mode==='connect'&&!source);
    if(mode==='connect'){connect(target);return;}
    if(!target||target.kind!=='atom')return;
    const ids=components(before).find(ids=>ids.includes(target.id))||[];
    if(mode==='species'){changeDraft('reactingIds',ids.some(id=>reactingIds.includes(id))?reactingIds.filter(id=>!ids.includes(id)):[...reactingIds,...ids]);return;}
    if(mode==='move'){
      if(doc.steps.length){setMessage('Positions of accepted intermediates are locked. Undo steps to change the starting layout.');return;}
      drag.current={start:p,scene:clone(doc.initial),ids,document:clone(doc)};canvas.current.setPointerCapture(e.pointerId);
    }
  };
  const canvasMove=e=>{if(!drag.current)return;const p=point(e),d=drag.current;setDoc({...doc,initial:{...d.scene,atoms:d.scene.atoms.map(a=>d.ids.includes(a.id)?{...a,x:a.x+p.x-d.start.x,y:a.y+p.y-d.start.y}:a)}});};
  const canvasUp=()=>{if(!drag.current)return;undo.current.push(drag.current.document);redo.current=[];drag.current=null;};
  const setInitial=scene=>{mutate({...emptyAnimation(),initial:scene});setStepIndex(0);};
  const importSource=async()=>{setBusy(true);try{const entry=imports.find(d=>d.id===importId);if(!entry)throw new Error('Choose a drawing.');let drawing=entry.doc;
    if(!drawing){const result=await fetchDrawing(entry.id.slice(6));if(result.error)throw new Error(result.error);drawing=result.data.data;}
    setInitial(await drawingToScene(drawing));}catch(e){setMessage(e.message);}finally{setBusy(false);}};
  const propose=()=>{try{
    for(const f of flows)if(f.source.kind==='pair'&&f.target.kind==='atom'){
      const ids=components(before).find(ids=>ids.includes(f.source.id));
      if(!ids.includes(f.target.id)&&!ids.some(id=>reactingIds.includes(id)))throw new Error('Select the attacking species with “Reacting species” before proposing this intermolecular step.');
    }
    const result=proposeStep(before,flows,reactingIds);setProposal(result);setProgress(1);setMessage('Review the proposed bonds and formal charges. Accept to save this intermediate.');
  }catch(e){setMessage(e.message);}};
  const accept=()=>{const step={id:crypto.randomUUID(),title:`Step ${doc.steps.length+1}`,flows:clone(flows),after:proposal.scene,reactingIds:clone(reactingIds)};mutate({...doc,steps:[...doc.steps,step],draftFlows:[],reactingIds:[]});setStepIndex(doc.steps.length+1);setMessage('Intermediate accepted. Connect arrows for the next step.');};
  const doExport=async format=>{setBusy(true);setPlaying(false);controller.current=new AbortController();setExportProgress(0);try{const blob=await exportAnimation(doc,format,{speed,onProgress:setExportProgress,signal:controller.current.signal});downloadBlob(blob,(sync.title||'animation')+'.'+(format==='gif'?'gif':'webm'));setMessage('Animation exported.');}catch(e){setMessage(e.message);}finally{setBusy(false);setExportProgress(null);}};
  const sourceOptions=[...before.atoms.filter(a=>lonePairCount(before,a.id)>0).map(a=>({kind:'pair',id:a.id})),...before.bonds.map(b=>({kind:'bond',id:b.id}))];
  const targetOptions=[...before.atoms.map(a=>({kind:'atom',id:a.id})),...before.bonds.map(b=>({kind:'bond',id:b.id}))];
  const label=t=>t.kind==='pair'?`${t.id} · lone pair`:t.kind==='bond'?`${t.id} · bond`:`${t.id} · atom`;
  return <div className="animation-editor">
    <header><a href="/" onClick={async e=>{e.preventDefault();await sync.saveNow();if(sync.isDurable())location.href='/';else setMessage('Save failed. Download the animation JSON before leaving.');}}><img src="/logoFinal4.png" alt=""/>Home</a><span className="animation-badge">Animate</span>
      <button onClick={()=>downloadBlob(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),sync.title+'.animation.json')}>Save JSON</button>
      <label className="file-button">Open JSON<input type="file" accept=".json" disabled={!sync.ready||busy} onChange={async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(data.kind!=='animation'||!Array.isArray(data.steps)||validateScene(data.initial).length)throw new Error('Invalid animation document.');for(const step of data.steps)if(validateScene(step.after).length)throw new Error('Invalid intermediate.');mutate(data);setStepIndex(data.steps.length);}catch(error){setMessage(error.message);}e.target.value='';}}/></label>
      <div className="animation-title"><input aria-label="Animation title" disabled={!sync.ready} value={sync.title} onChange={e=>sync.setTitle(e.target.value)}/><small role="status">{!sync.ready?'Loading…':sync.status==='saving'?'Saving…':sync.status==='local'?'Saved on this device':sync.status==='error'||sync.status==='storage-error'?sync.error:sync.status==='dirty'?'Changes pending…':auth.user?'Saved to cloud':'Saved on this device'}</small></div>
      <button disabled={busy||!doc.steps.length} onClick={()=>doExport('gif')}>Export GIF</button><button disabled={busy||!doc.steps.length} onClick={()=>doExport('video')}>Export video</button>
    </header>
    <div className="animation-workspace"><aside className="animation-sidebar">
      <h2>Starting structure</h2>
      <button disabled={!sync.ready||busy||!!doc.steps.length} onClick={()=>setInitial(carbonylExample())}>Carbonyl example</button>
      <select aria-label="Drawing to animate" value={importId} onChange={e=>setImportId(e.target.value)}><option value="">Choose a saved drawing</option>{imports.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
      <button disabled={!importId||busy||!sync.ready||!!doc.steps.length} onClick={importSource}>Import drawing</button>
      <input aria-label="Starting structure SMILES" placeholder="SMILES, including reacting species" value={smiles} onChange={e=>setSmiles(e.target.value)}/>
      <button disabled={!smiles||busy||!sync.ready||!!doc.steps.length} onClick={async()=>{setBusy(true);try{const graph=await smilesToGraph(smiles);if(graph.warnings.length)throw new Error(graph.warnings.join(' '));setInitial(await drawingToScene(graphToDrawing(graph)));}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>Import SMILES</button>
      <h2>Set up this step</h2><p>Choose the moving species, then connect each electron pair to its destination.</p>
      {['species','connect','move'].map(value=><button key={value} aria-pressed={mode===value} disabled={viewing||!!proposal} onClick={()=>{setMode(value);setSource(null);}}>{({species:'Reacting species',connect:'Connect electron flow',move:'Move starting species'})[value]}</button>)}
      <label><input type="checkbox" checked={tags} onChange={e=>setTags(e.target.checked)}/> Show identifiers</label>
      <h2>Steps</h2><ol>{doc.steps.map((step,i)=><li key={step.id}><button aria-pressed={stepIndex===i} onClick={()=>{setStepIndex(i);setProposal(null);stop();}}>{step.title}</button></li>)}</ol>
      <button aria-pressed={!viewing} onClick={()=>{setStepIndex(doc.steps.length);setProposal(null);stop();}}>+ Next step</button>
      <div className="animation-row"><button disabled={!undo.current.length} onClick={onUndo}>Undo</button><button disabled={!redo.current.length} onClick={onRedo}>Redo</button></div>
    </aside>
    <main><canvas ref={canvas} width="1000" height="600" aria-label="Animation canvas" onPointerDown={canvasDown} onPointerMove={canvasMove} onPointerUp={canvasUp} onPointerCancel={canvasUp}/>
      {!before.atoms.length&&<div className="animation-empty">Start with a drawing, SMILES, or the carbonyl example.</div>}
      <div className="animation-transport"><button disabled={!viewing&&!proposal} onClick={()=>{if(progress>=1)setProgress(0);setPlaying(v=>!v);}}>{playing?'Pause':'Play'}</button><button onClick={stop}>Reset</button><input aria-label="Animation progress" type="range" min="0" max="1" step=".005" value={progress} disabled={!viewing&&!proposal} onChange={e=>{setPlaying(false);setProgress(+e.target.value);}}/><label>Speed <select value={speed} onChange={e=>{setPlaying(false);setSpeed(+e.target.value);}}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label></div>
      <p className="animation-message" role="status">{message||'Two-electron mechanisms · illustrative 2D motion. Review each proposed intermediate.'}</p>
      {exportProgress!==null&&<div>Exporting… {Math.round(exportProgress*100)}% <button onClick={()=>controller.current?.abort()}>Cancel export</button></div>}
    </main>
    <aside className="animation-inspector"><h2>{viewing?'Saved step':proposal?'Review intermediate':'Electron flow'}</h2>
      {viewing&&<label>Step name<input value={savedStep.title} onChange={e=>{const steps=doc.steps.map((s,i)=>i===stepIndex?{...s,title:e.target.value}:s);setDoc({...doc,steps});}}/></label>}
      {!viewing&&!proposal&&<><p>Click a lone pair or bond, then an atom or bond. You can also attach targets here by identifier.</p>
        <label>Source<select aria-label="Electron source" value={source?JSON.stringify(source):''} onChange={e=>setSource(e.target.value?JSON.parse(e.target.value):null)}><option value="">Choose a source</option>{sourceOptions.map(t=><option key={JSON.stringify(t)} value={JSON.stringify(t)}>{label(t)}</option>)}</select></label>
        <label>Destination<select aria-label="Electron destination" value="" disabled={!source} onChange={e=>connect(JSON.parse(e.target.value))}><option value="">Choose a destination</option>{targetOptions.map(t=><option key={JSON.stringify(t)} value={JSON.stringify(t)}>{label(t)}</option>)}</select></label>
        {source&&<button onClick={()=>setSource(null)}>Cancel connection</button>}
      </>}
      <ol>{flows.map((f,i)=><li key={i}>{label(f.source)} → {label(f.target)}{!viewing&&!proposal&&<button aria-label={`Remove arrow ${i+1}`} onClick={()=>changeDraft('draftFlows',flows.filter((_,j)=>i!==j))}>×</button>}</li>)}</ol>
      {!viewing&&!proposal&&before.atoms.some(a=>a.id==='O3')&&doc.steps.length<2&&<button onClick={()=>mutate({...doc,draftFlows:exampleFlows(doc.steps.length),reactingIds:doc.steps.length?[]:['O3']})}>Use example arrows</button>}
      {!viewing&&!proposal&&<button className="primary" disabled={!flows.length||busy} onClick={propose}>Propose next structure</button>}
      {proposal&&<><ul>{proposal.changes.map(c=><li key={c}>{c}</li>)}</ul><p>Total formal charge: {proposal.scene.atoms.reduce((n,a)=>n+a.charge,0)}</p><button className="primary" onClick={accept}>Accept intermediate</button><button onClick={()=>{setProposal(null);stop();}}>Back to arrows</button></>}
      <h2>Atom identities</h2><div className="atom-identities">{(progress>=.85?after:before).atoms.map(a=><div key={a.id}><strong>{a.id}</strong> {a.element} · charge {a.charge>0?'+':''}{a.charge||0} · {lonePairCount(progress>=.85?after:before,a.id)} lone pairs</div>)}</div>
    </aside></div>
  </div>;
}
