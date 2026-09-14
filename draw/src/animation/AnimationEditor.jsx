import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react';
import {emptyAnimation,clone,carbonylExample,exampleFlows,components,lonePairCount,validateScene} from './model.js';
import {compileSequence,prepareAnimation,newStep,saveCompiled,completedAnimation} from './sequence.js';
import {renderMechanism,hitTarget,sceneViewport} from './render.js';
import {drawingToScene} from './importDrawing.js';
import {exportAnimation,downloadBlob} from './export.js';
import {useAuth} from '../hooks/useAuth.js';
import {useDocumentSync} from '../hooks/useDocumentSync.js';
import {listLocalDocuments} from '../lib/localLibrary.js';
import {listDrawings,fetchDrawing} from '../lib/documents.js';
import {smilesToGraph} from '../chemistry/importStructure.js';
import {graphToDrawing} from '../chemistry/graphToDrawing.js';
import StartingDrawingEditor from './StartingDrawingEditor.jsx';
import './animation.css';

function StepCanvas({step,active,tags,source,layoutScene,onDown,onMove,onUp,canvasRef}){
  const ref=useRef(null);
  const view=sceneViewport(layoutScene||step.before);
  useEffect(()=>{
    if(!step.before)return;
    const ctx=ref.current.getContext('2d');ctx.fillStyle='#f4f4f5';ctx.fillRect(0,0,1000,600);ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
    renderMechanism(ctx,step.before,step.before,step.flows,0,{tags,selected:active?source:null,reactingIds:active?step.reactingIds:[],background:'#f4f4f5'});ctx.restore();
  },[step,active,tags,source,layoutScene]);
  return step.before?<canvas ref={node=>{ref.current=node;if(active)canvasRef.current=node;}} data-view={JSON.stringify(view)} width="1000" height="600" aria-label={`${step.title} canvas`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}/>:<div className="blocked-step">Finish the previous step to see its product here.</div>;
}

export default function AnimationEditor(){
  const [doc,setDoc]=useState(()=>prepareAnimation(emptyAnimation())),[stepIndex,setStepIndex]=useState(0);
  const [mode,setMode]=useState('connect'),[source,setSource]=useState(null),[message,setMessage]=useState(''),[tags,setTags]=useState(false);
  const [progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[playback,setPlayback]=useState(false),[playIndex,setPlayIndex]=useState(0),[speed,setSpeed]=useState(1);
  const [smiles,setSmiles]=useState(''),[imports,setImports]=useState([]),[importId,setImportId]=useState('');
  const [drawingEditor,setDrawingEditor]=useState(false);
  const [busy,setBusy]=useState(false),[exportProgress,setExportProgress]=useState(null);
  const canvas=useRef(null),playCanvas=useRef(null),undo=useRef([]),redo=useRef([]),drag=useRef(null),controller=useRef(null);
  const auth=useAuth();
  const applyDoc=useCallback(next=>{setDoc(prepareAnimation(next));setStepIndex(0);setProgress(0);setPlaying(false);setPlayback(false);setSource(null);},[]);
  const captureThumbnail=useCallback(()=>(playCanvas.current||canvas.current)?.toDataURL('image/png')||null,[]);
  const sync=useDocumentSync({doc,applyDoc,userId:auth.user?.id||null,authLoading:auth.loading,captureThumbnail,emptyDocument:emptyAnimation,defaultTitle:'Untitled animation',documentKind:'animation'});
  const steps=useMemo(()=>compileSequence(doc.initial,doc.steps),[doc]);
  const step=steps[stepIndex]||steps[0];
  const before=step?.before,flows=step?.flows||[],reactingIds=step?.reactingIds||[];
  const mutate=next=>{undo.current.push(clone(doc));redo.current=[];setDoc(saveCompiled(next));setPlaying(false);setProgress(0);setSource(null);setMessage('');};
  const changeStep=patch=>mutate({...doc,steps:doc.steps.map((s,i)=>i===stepIndex?{...s,...patch}:s)});
  const stop=()=>{setPlaying(false);setPlayback(false);setProgress(0);};
  const selectStep=i=>{stop();setStepIndex(i);setSource(null);setMessage('');};
  useEffect(()=>{let cancelled=false;
    const local=listLocalDocuments().filter(d=>d.doc?.kind!=='animation').map(d=>({id:'local:'+d.id,title:d.title,doc:d.doc}));setImports(local);
    if(auth.user)listDrawings(100).then(({data})=>{if(!cancelled)setImports([...local,...(data||[]).map(d=>({id:'cloud:'+d.id,title:d.title}))]);});
    return()=>{cancelled=true};
  },[auth.user]);
  useEffect(()=>{
    const current=steps[playIndex];
    if(playback&&playCanvas.current&&current?.after)renderMechanism(playCanvas.current.getContext('2d'),current.before,current.after,current.flows,progress,{tags,background:'#fff'});
  },[playback,steps,playIndex,progress,tags]);
  useEffect(()=>{
    if(!playing||!playback)return;
    let frame,last=performance.now(),elapsed=progress*6/speed;
    const tick=now=>{elapsed+=(now-last)/1000;last=now;setProgress(Math.min(1,elapsed*speed/6));
      if(elapsed>=7/speed){if(playIndex+1<steps.length){setPlayIndex(i=>i+1);setProgress(0);}else setPlaying(false);return;}
      frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,playback,speed,playIndex]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const history=direction=>{const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.current.length)return;to.current.push(clone(doc));const next=from.current.pop();setDoc(next);setStepIndex(Math.min(stepIndex,next.steps.length-1));setSource(null);stop();};
  const point=e=>{const box=e.currentTarget.getBoundingClientRect();const v=JSON.parse(e.currentTarget.dataset.view||'{"scale":1,"x":0,"y":0}');return {x:((e.clientX-box.left)*1000/box.width-v.x)/v.scale,y:((e.clientY-box.top)*600/box.height-v.y)/v.scale};};
  const canvasDown=(e,index)=>{
    if(!sync.ready||busy)return;
    if(index!==stepIndex){selectStep(index);return;}
    if(!before)return;
    const p=point(e),target=hitTarget(before,p.x,p.y,mode==='connect'&&!source);
    if(!target)return;
    if(mode==='connect'){
      if(!source){if(target.kind==='pair'&&lonePairCount(before,target.id)===0){setMessage('Select a lone pair or a bond as the electron source.');return;}setSource(target);setMessage('Now click the receiving atom or bond.');}
      else{
        // Automatically move the donor fragment when a new intermolecular bond forms.
        const ids=source.kind==='pair'&&target.kind==='atom'?(components(before).find(ids=>ids.includes(source.id))||[]):[];
        changeStep({flows:[...flows,{source,target}],reactingIds:[...new Set([...reactingIds,...(!ids.includes(target.id)?ids:[])])]});
      }
      return;
    }
    if(target.kind!=='atom')return;
    const ids=components(before).find(ids=>ids.includes(target.id))||[];
    if(mode==='species'){changeStep({reactingIds:ids.some(id=>reactingIds.includes(id))?reactingIds.filter(id=>!ids.includes(id)):[...reactingIds,...ids]});return;}
    if(mode==='move'){
      if(stepIndex){setMessage('This structure is the previous step’s product. Edit step 1 to change the starting layout.');return;}
      drag.current={start:p,scene:clone(doc.initial),ids,document:clone(doc)};e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const canvasMove=e=>{if(!drag.current)return;const p=point(e),d=drag.current;setDoc(saveCompiled({...doc,initial:{...d.scene,atoms:d.scene.atoms.map(a=>d.ids.includes(a.id)?{...a,x:a.x+p.x-d.start.x,y:a.y+p.y-d.start.y}:a)}}));};
  const canvasUp=()=>{if(!drag.current)return;undo.current.push(drag.current.document);redo.current=[];drag.current=null;setDoc(current=>({...current}));};
  const setInitial=scene=>{mutate({...prepareAnimation(emptyAnimation()),initial:scene});setStepIndex(0);stop();};
  const importSource=async()=>{setBusy(true);try{const entry=imports.find(d=>d.id===importId);if(!entry)throw new Error('Choose a drawing.');let drawing=entry.doc;
    if(!drawing){const result=await fetchDrawing(entry.id.slice(6));if(result.error)throw new Error(result.error);drawing=result.data.data;}
    setInitial(await drawingToScene(drawing));}catch(e){setMessage(e.message);}finally{setBusy(false);}};
  const addStep=()=>{const invalid=steps.findIndex(s=>s.error);if(invalid>=0){selectStep(invalid);setMessage(steps[invalid].error);return;}mutate({...doc,steps:[...doc.steps,newStep(doc.steps.length)]});setStepIndex(doc.steps.length);};
  const complete=()=>{try{const next=completedAnimation(doc);setDoc(next);setPlayIndex(0);setProgress(0);setSource(null);setMessage('');setPlayback(true);setPlaying(true);}catch(e){setMessage(e.message);const invalid=steps.findIndex(s=>s.error);if(invalid>=0)setStepIndex(invalid);}};
  const doExport=async format=>{setBusy(true);setPlaying(false);controller.current=new AbortController();setExportProgress(0);try{const blob=await exportAnimation(completedAnimation(doc),format,{speed,onProgress:setExportProgress,signal:controller.current.signal});downloadBlob(blob,(sync.title||'animation')+'.'+(format==='gif'?'gif':'webm'));setMessage('Animation exported.');}catch(e){setMessage(e.message);}finally{setBusy(false);setExportProgress(null);}};
  const label=t=>`${t.id} ${t.kind==='pair'?'lone pair':t.kind}`;
  const applyStarting=useCallback(scene=>{undo.current.push(clone(doc));redo.current=[];setDoc(saveCompiled({...doc,initial:scene}));setStepIndex(0);setSource(null);setDrawingEditor(false);setMessage('Starting molecules updated. Later steps are recalculated from their arrows.');},[doc]);
  return <div className="animation-editor">
    <header><a href="/" onClick={async e=>{e.preventDefault();await sync.saveNow();if(sync.isDurable())location.href='/';else setMessage('Save failed. Download the animation JSON before leaving.');}}><img src="/logoFinal4.png" alt="OpenReactions home"/></a>
      <details className="animation-menu"><summary>File</summary><div>
        <button onClick={()=>downloadBlob(new Blob([JSON.stringify(saveCompiled(doc),null,2)],{type:'application/json'}),sync.title+'.animation.json')}>Download animation JSON</button>
        <label className="file-button">Open animation JSON<input type="file" accept=".json" disabled={!sync.ready||busy} onChange={async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(data.kind!=='animation'||!Array.isArray(data.steps)||validateScene(data.initial).length)throw new Error('Invalid animation document.');mutate(prepareAnimation(data));setStepIndex(0);stop();}catch(error){setMessage(error.message);}e.target.value='';}}/></label>
        <button disabled={busy||steps.some(s=>s.error)} onClick={()=>doExport('gif')}>Export GIF</button><button disabled={busy||steps.some(s=>s.error)} onClick={()=>doExport('video')}>Export video</button>
      </div></details>
      <details className="animation-menu"><summary>View</summary><div><label><input type="checkbox" checked={tags} onChange={e=>setTags(e.target.checked)}/> Show identifiers</label></div></details>
      <div className="animation-title"><input aria-label="Animation title" disabled={!sync.ready} value={sync.title} onChange={e=>sync.setTitle(e.target.value)}/><small role="status">{!sync.ready?'Loading…':sync.status==='saving'?'Saving…':sync.status==='local'?'Saved on this device':sync.status==='error'||sync.status==='storage-error'?sync.error:sync.status==='dirty'?'Changes pending…':auth.user?'Saved to cloud':'Saved on this device'}</small></div><span className="animation-badge">Animation</span>
    </header>
    <div className="animation-workspace"><aside className="animation-sidebar">
      <h2>Tools</h2>
      {['connect','species','move'].map(value=><button key={value} aria-pressed={mode===value} disabled={playback} onClick={()=>{setMode(value);setSource(null);}}><span className="tool-symbol">{({species:'◌',connect:'↷',move:'↔'})[value]}</span>{({species:'Reacting species',connect:'Electron arrow',move:'Move species'})[value]}</button>)}
      {source&&<button onClick={()=>{setSource(null);setMessage('');}}>Cancel arrow</button>}
      <div className="animation-row"><button disabled={!undo.current.length||playback} onClick={()=>history('undo')}>Undo</button><button disabled={!redo.current.length||playback} onClick={()=>history('redo')}>Redo</button></div>
      <h2>Starting molecules</h2><button disabled={!sync.ready||busy||playback} onClick={()=>setDrawingEditor(true)}>{doc.initial.atoms.length?'Edit starting molecules':'Draw molecules'}</button><p>Import a drawing or try the example, then connect electron movements on the canvas.</p>
      <button disabled={!sync.ready||busy||playback||!!doc.initial.atoms.length} onClick={()=>setInitial(carbonylExample())}>Carbonyl example</button>
      <details className="starting-imports" open={!doc.initial.atoms.length}><summary>Import structure</summary>
        <select aria-label="Drawing to animate" value={importId} onChange={e=>setImportId(e.target.value)}><option value="">Choose a saved drawing</option>{imports.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
        <button disabled={!importId||busy||!sync.ready||playback||!!doc.initial.atoms.length} onClick={importSource}>Import drawing</button>
        <input aria-label="Starting structure SMILES" placeholder="SMILES" value={smiles} onChange={e=>setSmiles(e.target.value)}/>
        <button disabled={!smiles||busy||!sync.ready||playback||!!doc.initial.atoms.length} onClick={async()=>{setBusy(true);try{const graph=await smilesToGraph(smiles);if(graph.warnings.length)throw new Error(graph.warnings.join(' '));setInitial(await drawingToScene(graphToDrawing(graph)));}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>Import SMILES</button>
      </details>
    </aside>
    <main className={playback?'is-playing':''}>
      {playback?<><div className="playback-caption">{steps[playIndex]?.title}</div><canvas ref={playCanvas} width="1000" height="600" aria-label="Animation canvas"/></>:<>
        <div className="step-guide"><strong>{!doc.initial.atoms.length?'1. Add the starting molecules':source?'Choose where the electrons go':'Connect each electron movement'}</strong><span>{!doc.initial.atoms.length?'Use your saved drawing, SMILES, or the example.':'Click a lone pair or bond, then its destination. Add every arrow before continuing.'}</span></div>
        <div className="reaction-steps">{steps.map((s,i)=><section className={`reaction-step ${stepIndex===i?'active':''}`} key={s.id} data-step={i+1}>
          <button className="step-heading" aria-pressed={stepIndex===i} onClick={()=>selectStep(i)}><strong>{i+1}</strong><span>{s.title}</span><small>{s.error?'Add electron movements':'Ready'}</small></button>
          <StepCanvas step={s} layoutScene={i===0?drag.current?.scene:null} active={stepIndex===i} tags={tags} source={source} canvasRef={canvas} onDown={e=>canvasDown(e,i)} onMove={canvasMove} onUp={canvasUp}/>
          <div className="step-caption">{i>0?'Starting structure = previous step’s product':'Starting molecules'} · {s.flows.length} electron {s.flows.length===1?'arrow':'arrows'}</div>
        </section>)}</div>
        <button className="add-step" disabled={busy||!sync.ready} onClick={addStep}>+ Next step</button>
      </>}
    </main>
    <aside className="animation-inspector"><h2>Reaction steps</h2><p>Choose a step to edit its electron arrows. Products carry forward automatically.</p>
      <ol className="step-list">{steps.map((s,i)=><li key={s.id}><button aria-pressed={!playback&&stepIndex===i} onClick={()=>selectStep(i)}><strong>{s.title}</strong><small>{s.flows.length} arrows · {s.error?'Incomplete':'Ready'}</small></button></li>)}</ol>
      {!playback&&step&&<div className="step-details"><label>Step name<input aria-label="Step name" value={step.title} onChange={e=>changeStep({title:e.target.value})}/></label>
        {stepIndex>0&&<p>The atoms, bonds and charges come from step {stepIndex}.</p>}
        <ol>{flows.map((f,i)=><li key={i}><span>{label(f.source)} → {label(f.target)}</span><button aria-label={`Remove arrow ${i+1}`} onClick={()=>changeStep({flows:flows.filter((_,j)=>i!==j)})}>×</button></li>)}</ol>
        {step.error&&doc.initial.atoms.length>0&&<p className="step-error">{step.error}</p>}
        {!step.error&&<p className="step-ready">✓ Product ready for the next step</p>}
        {before?.atoms.some(a=>a.id==='O3')&&stepIndex<2&&<button onClick={()=>changeStep({flows:exampleFlows(stepIndex),reactingIds:stepIndex?[]:['O3']})}>Use example arrows</button>}
        {steps.length>1&&<button onClick={()=>{mutate({...doc,steps:doc.steps.filter((_,i)=>i!==stepIndex)});setStepIndex(Math.max(0,stepIndex-1));}}>Delete step</button>}
      </div>}
    </aside></div>
    <footer className="animation-bottom"><p className="animation-message" role="status">{message||(playback?'Stop to return to the step editor.':`Step ${stepIndex+1} of ${steps.length} · Two-electron mechanisms`)}</p>
      <div className="animation-transport"><button disabled={!playback} onClick={()=>{if(progress>=1&&playIndex===steps.length-1){setPlayIndex(0);setProgress(0);}setPlaying(v=>!v);}}>{playing?'Pause':'Play'}</button><button disabled={!playback} onClick={stop}>Stop</button><input aria-label="Animation progress" type="range" min="0" max={steps.length} step=".005" value={playback?playIndex+progress:0} disabled={!playback} onChange={e=>{const v=+e.target.value,index=Math.min(steps.length-1,Math.floor(v));setPlaying(false);setPlayIndex(index);setProgress(v-index);}}/><label>Speed <select value={speed} onChange={e=>setSpeed(+e.target.value)}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><button className="primary" disabled={!sync.ready||busy} onClick={complete}>Complete animation</button></div>
      {exportProgress!==null&&<div>Exporting… {Math.round(exportProgress*100)}% <button onClick={()=>controller.current?.abort()}>Cancel export</button></div>}
    </footer>
    {drawingEditor&&<StartingDrawingEditor scene={doc.initial} onApply={applyStarting} onClose={()=>{setDrawingEditor(false);sync.saveNow();}}/>}
  </div>;
}
