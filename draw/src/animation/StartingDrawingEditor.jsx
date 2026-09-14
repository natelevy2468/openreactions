import React,{useEffect,useRef,useState} from 'react';
import {sceneToDrawing} from './sceneDrawing.js';
import {drawingToScene} from './importDrawing.js';

/** The regular drawing workspace supplies chemistry tools; only explicit Apply crosses back. */
export default function StartingDrawingEditor({scene,onApply,onClose}){
  const [id]=useState(()=>{
    const id=crypto.randomUUID();
    localStorage.setItem('openreactions.localDocument.'+id,JSON.stringify({title:'Animation starting molecules',doc:sceneToDrawing(scene),updatedAt:new Date().toISOString()}));
    return id;
  });
  const frame=useRef(null),[error,setError]=useState(''),[waiting,setWaiting]=useState(false);
  useEffect(()=>{
    const receive=async event=>{
      if(event.origin!==location.origin||event.source!==frame.current?.contentWindow||event.data?.type!=='animation-drawing-result'||event.data.id!==id)return;
      try{if(event.data.error)throw new Error(event.data.error);const next=await drawingToScene(event.data.drawing,scene);onApply(next);}catch(e){setError(e.message);setWaiting(false);}
    };
    window.addEventListener('message',receive);
    return()=>{window.removeEventListener('message',receive);localStorage.removeItem('openreactions.localDocument.'+id);};
  },[id,scene,onApply]);
  return <div className="drawing-modal" role="dialog" aria-modal="true" aria-label="Edit starting molecules"><div className="drawing-modal-bar"><strong>Draw the starting molecules</strong><span>{error||'Use the drawing tools, then apply to your reaction.'}</span><button onClick={onClose}>Cancel</button><button className="primary" disabled={waiting} onClick={()=>{setWaiting(true);frame.current?.contentWindow.postMessage({type:'animation-drawing-request',id},location.origin);}}>Use these molecules</button></div><iframe ref={frame} title="Starting molecule drawing editor" src={`/draw/?local=${id}&animation-source=1`}/></div>;
}
