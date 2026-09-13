import React, { useEffect, useState } from 'react';
import { listLocalDocuments, restoreDeletedDocument } from '../lib/localLibrary.js';
export default function HistoryPanel({ getVersions, onRestore, onSave, colors }) {
  const [versions] = useState(getVersions);
  const [drawings, setDrawings] = useState([]), [trash, setTrash] = useState([]), [message, setMessage] = useState('');
  const refresh = () => {setDrawings(listLocalDocuments());setTrash(listLocalDocuments(true));};
  useEffect(refresh, []);
  return <div className="chemistry-tools" style={{'--chem-bg':colors.button,'--chem-text':colors.text,'--chem-border':colors.border,'--chem-accent':colors.buttonActive}}>
    <p>Checkpoints on this device</p>
    {!versions.length && <p>No checkpoints yet.</p>}
    {versions.map((v,i) => <button key={v.updatedAt+i} onClick={() => {onRestore(v);setMessage('Checkpoint restored. Undo returns to the previous drawing.');}}>{new Date(v.updatedAt).toLocaleString()} · {v.title}</button>)}
    <p>Browser trash · restores a local copy</p>
    {!trash.length && <p>Trash is empty.</p>}
    {trash.map(v => <button key={v.id} onClick={() => {try {restoreDeletedDocument(v.id);refresh();setMessage('Drawing restored.');} catch(e){setMessage(e.message);}}}>Restore {v.title}</button>)}
    <p>Drawings in this browser</p>
    {drawings.map(v => <a key={v.id} style={{color:colors.buttonActive}} href={'?local='+encodeURIComponent(v.id)+'&_open='+Date.now().toString(36)} onClick={async e => {e.preventDefault();const href=e.currentTarget.href;await onSave();window.location.assign(href);}}>{v.title}</a>)}
    {message && <p role="status">{message}</p>}
  </div>;
}
