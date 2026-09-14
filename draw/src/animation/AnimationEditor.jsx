import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react';
import HexGridWithToolbar from '../HexGridWithToolbar.jsx';
import {emptyAnimation,clone,carbonylExample,exampleFlows,validateScene} from './model.js';
import {compileSequence,prepareAnimation,newStep,completedAnimation} from './sequence.js';
import {renderMechanism,sceneViewport} from './render.js';
import {drawingForStep,readStepDrawing} from './stepDrawing.js';
import {drawingToScene} from './importDrawing.js';
import {renderMoleculePreview} from '../rendering/MoleculePreview.js';
import {renderArrow} from '../rendering/ArrowRenderer.js';
import {exportAnimation,downloadBlob} from './export.js';
import {useAuth} from '../hooks/useAuth.js';
import {useDocumentSync} from '../hooks/useDocumentSync.js';
import {listLocalDocuments} from '../lib/localLibrary.js';
import {listDrawings,fetchDrawing} from '../lib/documents.js';
import {smilesToGraph} from '../chemistry/importStructure.js';
import {graphToDrawing} from '../chemistry/graphToDrawing.js';
import './animation.css';

function DrawingPreview({drawing,onSelect}){
  const ref=useRef(null);
  useEffect(()=>{
    const ctx=ref.current.getContext('2d'),vs=drawing.vertices||[];
    ctx.fillStyle='#f4f4f5';ctx.fillRect(0,0,1000,600);
    const view=sceneViewport({atoms:vs});ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);
    const colors={bonds:'#000',text:'#000',canvasBackground:'#f4f4f5'};
    renderMoleculePreview(ctx,{vertices:vs,bonds:drawing.segments||[],atoms:drawing.vertexAtoms||{}},{x:0,y:0},colors);
    for(const arrow of drawing.arrows||[])renderArrow(ctx,arrow,{x:0,y:0},colors);
    ctx.restore();
  },[drawing]);
  return <canvas ref={ref} width="1000" height="600" aria-label="Step preview" onClick={onSelect}/>;
}

export default function AnimationEditor(){
  const [doc,setDoc]=useState(()=>prepareAnimation(emptyAnimation())),[stepIndex,setStepIndex]=useState(0);
  const [revision,setRevision]=useState(0),[toolbar,setToolbar]=useState(null),[message,setMessage]=useState(''),[tags,setTags]=useState(false);
  const [playDocument,setPlayDocument]=useState(null),[progress,setProgress]=useState(0),[playing,setPlaying]=useState(false),[playIndex,setPlayIndex]=useState(0),[speed,setSpeed]=useState(1);
  const [smiles,setSmiles]=useState(''),[imports,setImports]=useState([]),[importId,setImportId]=useState(''),[busy,setBusy]=useState(false),[exportProgress,setExportProgress]=useState(null);
  const drawingApi=useRef(null),playCanvas=useRef(null),latest=useRef(doc),controller=useRef(null);latest.current=doc;
  const auth=useAuth();
  const applyDoc=useCallback(next=>{setDoc(prepareAnimation(next));setStepIndex(0);setRevision(n=>n+1);setPlayDocument(null);setPlaying(false);},[]);
  const captureThumbnail=useCallback(()=>document.querySelector('.animation-editor main canvas')?.toDataURL('image/png')||null,[]);
  const sync=useDocumentSync({doc,applyDoc,userId:auth.user?.id||null,authLoading:auth.loading,captureThumbnail,emptyDocument:emptyAnimation,defaultTitle:'Untitled animation',documentKind:'animation'});
  const steps=useMemo(()=>compileSequence(doc.initial,doc.steps),[doc]);
  const step=steps[stepIndex]||steps[0],playback=!!playDocument;
  const initialDrawing=useMemo(()=>step?.drawing||drawingForStep(step?.before||doc.initial,step?.flows||[]),[step?.id,revision,stepIndex]);
  const stop=()=>{setPlaying(false);setPlayDocument(null);setProgress(0);setRevision(n=>n+1);};
  const selectStep=i=>{stop();setStepIndex(i);setMessage('');};
  useEffect(()=>{
    if(playback)return;
    const frame=requestAnimationFrame(()=>document.querySelector('.reaction-step.active')?.scrollIntoView({block:'nearest',inline:'nearest'}));
    return()=>cancelAnimationFrame(frame);
  },[stepIndex,playback]);
  const updateDrawing=useCallback(drawing=>{
    setDoc(current=>({...current,steps:current.steps.map((s,i)=>i===stepIndex?{...s,drawing,editError:null}:s)}));
  },[stepIndex]);
  useEffect(()=>{let cancelled=false;
    const local=listLocalDocuments().filter(d=>d.doc?.kind!=='animation').map(d=>({id:'local:'+d.id,title:d.title,doc:d.doc}));setImports(local);
    if(auth.user)listDrawings(100).then(({data})=>{if(!cancelled)setImports([...local,...(data||[]).map(d=>({id:'cloud:'+d.id,title:d.title}))]);});
    return()=>{cancelled=true};
  },[auth.user]);
  const playbackSteps=useMemo(()=>playDocument?compileSequence(playDocument.initial,playDocument.steps):[],[playDocument]);
  const camera=useMemo(()=>sceneViewport({atoms:playbackSteps.flatMap(s=>[...s.before.atoms,...s.after.atoms])}),[playbackSteps]);
  useEffect(()=>{
    const current=playbackSteps[playIndex],canvas=playCanvas.current;if(!current||!canvas)return;
    const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,600);
    ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.scale,camera.scale);
    renderMechanism(ctx,current.before,current.after,current.flows,progress,{tags,background:'#fff'});ctx.restore();
  },[playbackSteps,playIndex,progress,tags,camera]);
  useEffect(()=>{
    if(!playing||!playback)return;
    let frame,last=performance.now(),elapsed=progress*6/speed;
    const tick=now=>{elapsed+=(now-last)/1000;last=now;setProgress(Math.min(1,elapsed*speed/6));
      if(elapsed>=7/speed){if(playIndex+1<playbackSteps.length){setPlayIndex(i=>i+1);setProgress(0);}else setPlaying(false);return;}
      frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,playback,speed,playIndex]);
  useEffect(()=>()=>controller.current?.abort(),[]);

  // Resolve the drawn arrow endpoints and rebuild every intermediate in order.
  // Await this before switching steps or playback so no stale cached product plays.
  const resolveDrawings=async(count=latest.current.steps.length)=>{
    const next=clone(latest.current);
    const active=drawingApi.current?.getDocument();if(active)next.steps[stepIndex].drawing=active;
    let previous=next.initial;
    for(let i=0;i<count;i++){
      const s=next.steps[i];
      try{
        if(s.drawing){const result=await readStepDrawing(s.drawing,i===0?next.initial:previous);
          if(i===0)next.initial=result.scene;else s.startScene=result.scene;
          s.flows=result.flows;s.reactingIds=result.reactingIds;
          // Persist identifiers into the editable vertices for subsequent editing.
          s.drawing.vertices=s.drawing.vertices.map(v=>({...v,animationAtomId:result.scene.atoms.find(a=>Math.hypot(a.x-v.x,a.y-v.y)<.01)?.id}));
        }
        s.editError=null;
        const compiled=compileSequence(next.initial,next.steps.slice(0,i+1));
        if(compiled[i].error)throw new Error(compiled[i].error);
        s.after=compiled[i].after;previous=s.after;
      }catch(e){s.editError=e.message;s.after=null;for(let j=i+1;j<next.steps.length;j++)next.steps[j].after=null;setDoc(next);setStepIndex(i);setMessage(`Step ${i+1}: ${e.message}`);return null;}
    }
    setDoc(next);return next;
  };
  const addStep=async()=>{setBusy(true);try{const next=await resolveDrawings();if(!next)return;const scene=next.steps.at(-1).after;
    next.steps.push({...newStep(next.steps.length),drawing:drawingForStep(scene),startScene:scene});setDoc(next);setStepIndex(next.steps.length-1);setRevision(n=>n+1);setMessage('Recommended product from the previous step. Draw the next electron movements here.');
  }finally{setBusy(false);}};
  const complete=async()=>{setBusy(true);try{const next=await resolveDrawings();if(!next)return;const completed=completedAnimation(next);
    setDoc(completed);setPlayIndex(0);setProgress(0);setMessage('');setPlayDocument(completed);setPlaying(true);
  }catch(e){setMessage(e.message);}finally{setBusy(false);}};
  const setInitial=scene=>{const next=prepareAnimation({...emptyAnimation(),initial:scene});next.steps[0].drawing=drawingForStep(scene);setDoc(next);setStepIndex(0);setRevision(n=>n+1);setMessage('Draw curved arrows with the left toolbar, then choose Next step.');};
  const useExample=()=>{const before=step.before||doc.initial;setDoc(current=>({...current,steps:current.steps.map((s,i)=>i===stepIndex?{...s,flows:exampleFlows(i),reactingIds:i?[]:['O3'],drawing:drawingForStep(before,exampleFlows(i)),editError:null}:s)}));setRevision(n=>n+1);};
  const recommend=async()=>{setBusy(true);try{
    const next=await resolveDrawings(stepIndex);if(!next)return;
    const previous=stepIndex?next.steps[stepIndex-1].after:next.initial;
    next.steps[stepIndex]={...next.steps[stepIndex],drawing:drawingForStep(previous),startScene:previous,flows:[],editError:null};
    setDoc(next);setRevision(n=>n+1);setMessage('Recommended structure restored. Add the electron arrows for this step.');
  }finally{setBusy(false);}};
  const importSource=async()=>{setBusy(true);try{const entry=imports.find(d=>d.id===importId);if(!entry)throw new Error('Choose a drawing.');let drawing=entry.doc;
    if(!drawing){const result=await fetchDrawing(entry.id.slice(6));if(result.error)throw new Error(result.error);drawing=result.data.data;}
    setInitial(await drawingToScene(drawing));}catch(e){setMessage(e.message);}finally{setBusy(false);}};
  const doExport=async format=>{setBusy(true);setPlaying(false);controller.current=new AbortController();setExportProgress(0);try{const next=playDocument||await resolveDrawings();if(!next)return;const blob=await exportAnimation(completedAnimation(next),format,{speed,onProgress:setExportProgress,signal:controller.current.signal});downloadBlob(blob,(sync.title||'animation')+'.'+(format==='gif'?'gif':'webm'));setMessage('Animation exported.');}catch(e){setMessage(e.message);}finally{setBusy(false);setExportProgress(null);}};
  return <div className="animation-editor">
    <header><a href="/" onClick={async e=>{e.preventDefault();await sync.saveNow();if(sync.isDurable())location.href='/';else setMessage('Save failed. Download the animation JSON before leaving.');}}><img src="/logoFinal4.png" alt="OpenReactions home"/></a>
      <details className="animation-menu"><summary>File</summary><div>
        <button onClick={()=>downloadBlob(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),sync.title+'.animation.json')}>Download animation JSON</button>
        <label className="file-button">Open animation JSON<input type="file" accept=".json" disabled={!sync.ready||busy} onChange={async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(data.kind!=='animation'||!Array.isArray(data.steps)||validateScene(data.initial).length)throw new Error('Invalid animation document.');applyDoc(data);}catch(error){setMessage(error.message);}e.target.value='';}}/></label>
        <button disabled={busy} onClick={()=>doExport('gif')}>Export GIF</button><button disabled={busy} onClick={()=>doExport('video')}>Export video</button>
      </div></details>
      <details className="animation-menu"><summary>View</summary><div><label><input type="checkbox" checked={tags} onChange={e=>setTags(e.target.checked)}/> Show playback identifiers</label></div></details>
      <div className="animation-title"><input aria-label="Animation title" disabled={!sync.ready} value={sync.title} onChange={e=>sync.setTitle(e.target.value)}/><small role="status">{!sync.ready?'Loading…':sync.status==='saving'?'Saving…':sync.status==='error'||sync.status==='storage-error'?sync.error:sync.status==='dirty'?'Changes pending…':auth.user?'Saved to cloud':'Saved on this device'}</small></div><span className="animation-badge">Animation</span>
    </header>
    <div className="animation-workspace" inert={busy?true:undefined}><aside className="animation-drawing-tools" ref={setToolbar} aria-label="Drawing tools">{playback&&<p>Press Stop to return to drawing.</p>}</aside>
    <main className={playback?'is-playing':''}>
      {playback?<div className="playback-stage"><div className="playback-caption">{playbackSteps[playIndex]?.title}</div><canvas ref={playCanvas} width="1000" height="600" aria-label="Animation canvas"/></div>:<>
        <div className="step-guide"><strong>Draw the mechanism, one step at a time</strong><span>Use the drawing toolbar in each box. Draw curved electron arrows, then add the next step.</span></div>
        <div className="reaction-steps">{steps.map((s,i)=><section className={`reaction-step ${stepIndex===i?'active':''}`} key={s.id} data-step={i+1}>
          <button className="step-heading" aria-pressed={stepIndex===i} onClick={()=>selectStep(i)}><strong>{i+1}</strong><span>{s.title}</span><small>{stepIndex===i?'Editing':'Click to edit'}</small></button>
          <div className="step-drawing-area">{stepIndex===i&&toolbar&&sync.ready?<HexGridWithToolbar key={`${s.id}:${revision}`} embeddedDocument={initialDrawing} embeddedApiRef={drawingApi} onEmbeddedChange={updateDrawing} toolbarTarget={toolbar}/>:<DrawingPreview drawing={s.drawing||drawingForStep(s.before||doc.initial,s.flows)} onSelect={()=>selectStep(i)}/>}</div>
          <div className="step-caption">{i>0?'Recommended starting structure from the previous step':'Draw your starting molecules here'} · {(s.drawing?.arrows||s.flows).length} arrows</div>
        </section>)}</div>
        <button className="add-step" disabled={busy||!sync.ready} onClick={addStep}>+ Next step</button>
      </>}
    </main>
    <aside className="animation-inspector"><details open className="animation-steps-menu"><summary>Steps</summary><p>Draw in a box, then move on. Each next box recommends the previous step’s product.</p>
      <ol className="step-list">{steps.map((s,i)=><li key={s.id}><button aria-pressed={!playback&&stepIndex===i} onClick={()=>selectStep(i)}><strong>{s.title}</strong><small>{(s.drawing?.arrows||s.flows).length} electron arrows</small></button></li>)}</ol>
      {!playback&&step&&<div className="step-details"><label>Step name<input aria-label="Step name" value={step.title} onChange={e=>setDoc({...doc,steps:doc.steps.map((s,i)=>i===stepIndex?{...s,title:e.target.value}:s)})}/></label>
        <p>Use Select / move in the drawing toolbar to reposition species. Curved arrows attach to the electron source and destination when you continue.</p>
        {step.editError&&<p className="step-error" role="alert">{step.editError}</p>}
        {stepIndex>0&&<button onClick={recommend}>Use recommended structure</button>}
        {(step.before||doc.initial).atoms.some(a=>a.id==='O3')&&stepIndex<2&&<button onClick={useExample}>Use example arrows</button>}
        <button disabled={busy} onClick={async()=>{setBusy(true);try{if(await resolveDrawings()){setRevision(n=>n+1);setMessage('All electron arrows are connected and the products are ready.');}}finally{setBusy(false);}}}>Check electron movements</button>
        {steps.length>1&&<button onClick={()=>{setDoc({...doc,steps:doc.steps.filter((_,i)=>i!==stepIndex)});setStepIndex(Math.max(0,stepIndex-1));setRevision(n=>n+1);}}>Delete step</button>}
        <h2>Starting molecules</h2><button disabled={!sync.ready||busy||!!doc.initial.atoms.length||!!doc.steps[0].drawing?.vertices.length} onClick={()=>setInitial(carbonylExample())}>Carbonyl example</button>
        <details className="starting-imports"><summary>Import structure</summary>
          <select aria-label="Drawing to animate" value={importId} onChange={e=>setImportId(e.target.value)}><option value="">Choose a saved drawing</option>{imports.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
          <button disabled={!importId||busy||!!doc.steps[0].drawing?.vertices.length} onClick={importSource}>Import drawing</button>
          <input aria-label="Starting structure SMILES" placeholder="SMILES" value={smiles} onChange={e=>setSmiles(e.target.value)}/>
          <button disabled={!smiles||busy||!!doc.steps[0].drawing?.vertices.length} onClick={async()=>{setBusy(true);try{const graph=await smilesToGraph(smiles);if(graph.warnings.length)throw new Error(graph.warnings.join(' '));setInitial(await drawingToScene(graphToDrawing(graph)));}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>Import SMILES</button>
        </details>
      </div>}
    </details></aside></div>
    <footer className="animation-bottom"><p className="animation-message" role="status">{message||(playback?'Stop to return to the step boxes.':`Editing step ${stepIndex+1} of ${steps.length}`)}</p>
      <div className="animation-transport"><button disabled={!playback} onClick={()=>{if(progress>=1&&playIndex===playbackSteps.length-1){setPlayIndex(0);setProgress(0);}setPlaying(v=>!v);}}>{playing?'Pause':'Play'}</button><button disabled={!playback} onClick={stop}>Stop</button><input aria-label="Animation progress" type="range" min="0" max={playbackSteps.length||1} step=".005" value={playback?playIndex+progress:0} disabled={!playback} onChange={e=>{const v=+e.target.value,index=Math.min(playbackSteps.length-1,Math.floor(v));setPlaying(false);setPlayIndex(index);setProgress(v-index);}}/><label>Speed <select value={speed} onChange={e=>setSpeed(+e.target.value)}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label><button className="primary" disabled={!sync.ready||busy} onClick={complete}>Complete animation</button></div>
      {exportProgress!==null&&<div>Exporting… {Math.round(exportProgress*100)}% <button onClick={()=>controller.current?.abort()}>Cancel export</button></div>}
    </footer>
  </div>;
}
