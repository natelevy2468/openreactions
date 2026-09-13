import {useEffect,useState,lazy,Suspense} from 'react';
import './App.css';
import HexGridWithToolbar from './HexGridWithToolbar';
import {fetchDrawing} from './lib/documents.js';
const AnimationEditor=lazy(()=>import('./animation/AnimationEditor.jsx'));
function localKind(){
  const params=new URLSearchParams(location.search);
  if(params.has('doc'))return null;
  if(params.has('local')){
    try {const entry=JSON.parse(localStorage.getItem('openreactions.localDocument.'+params.get('local')));if(entry?.doc)return entry.doc.kind||'drawing';}catch{}
  }
  if(params.has('new'))return location.pathname.startsWith('/animate')||params.get('kind')==='animation'?'animation':'drawing';
  if(location.pathname.startsWith('/animate')||params.get('kind')==='animation')return 'animation';
  try {const last=localStorage.getItem('openreactions.lastDocId')||'local';return JSON.parse(localStorage.getItem('openreactions.draft.'+last))?.doc?.kind||'drawing';}catch{return 'drawing';}
}
function App(){
  const [kind,setKind]=useState(localKind);
  useEffect(()=>{
    if(kind)return;
    let cancelled=false;const params=new URLSearchParams(location.search),id=params.get('doc');
    fetchDrawing(id).then(({data})=>{
      if(cancelled)return;
      let doc=data?.data;
      if(!doc)try {doc=JSON.parse(localStorage.getItem('openreactions.draft.'+id))?.doc;}catch{}
      setKind(doc?.kind||params.get('kind')||'drawing');
    });
    return()=>{cancelled=true};
  },[kind]);
  if(!kind)return <p role="status">Opening document…</p>;
  return <Suspense fallback={<p role="status">Opening animation…</p>}>{kind==='animation'?<AnimationEditor/>:<HexGridWithToolbar/>}</Suspense>;
}
export default App;
