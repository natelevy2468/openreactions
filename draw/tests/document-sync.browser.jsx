import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDocumentSync } from '../src/hooks/useDocumentSync.js';
import { emptyDoc } from '../src/lib/docModel.js';
import { readDraft, writeDraft } from '../src/lib/localDoc.js';
import { listLocalDocuments } from '../src/lib/localLibrary.js';
import { backend } from './sync-backend.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const drawing = (x = 10) => ({ ...emptyDoc(), vertices: [{ x, y: 10 }] });
const row = (id, title = id, doc = drawing()) => ({ id, title, data: doc, updated_at: '2026-01-01T00:00:00Z' });
const tick = () => new Promise(r => setTimeout(r, 30));
const until = async (predicate) => { for (let n = 0; n < 100; n++) { if (predicate()) return; await tick(); } throw new Error('Timed out'); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
let api, root, harnessUser = 'test-user';
function Harness() {
  const [doc, setDoc] = useState(emptyDoc());
  const sync = useDocumentSync({ doc, applyDoc: setDoc, userId: harnessUser, authLoading: false });
  api = { ...sync, doc, setDoc };
  return <div>{sync.title}: {sync.status}</div>;
}
async function mount(id, setup = () => {}, user = 'test-user') {
  harnessUser = user;
  root?.unmount();
  localStorage.clear();
  history.replaceState({}, '', id ? `?doc=${id}` : location.pathname);
  backend.fetch = async id => ({ data: row(id), error: null });
  backend.create = async () => ({ data: { id: A }, error: null });
  backend.update = async id => ({ data: row(id), error: null });
  setup();
  root = createRoot(document.getElementById('root'));
  root.render(<Harness />);
  await until(() => api?.ready);
  await tick();
}
const results = [];
async function test(name, run) {
  api = null;
  try { await run(); results.push({ name, passed: true }); }
  catch (e) { results.push({ name, passed: false, error: e.message }); }
}
await test('Failed cloud load preserves and opens the local recovery draft', async () => {
  await mount(A, () => {
    writeDraft(A, { title: 'Recovered chemistry', doc: drawing(90) });
    backend.fetch = async () => ({ data: null, error: 'Failed to fetch' });
  });
  assert(api.doc.vertices[0].x === 90, 'Recovery content was not opened');
  assert(readDraft(A).title === 'Recovered chemistry', 'Recovery copy was removed');
  assert(api.status === 'error', 'Cloud failure must be visible');
});
await test('Switching waits for an in-flight create and retains the selected document', async () => {
  await mount();
  const request = deferred();
  backend.create = () => request.promise;
  api.setDoc(drawing(20)); await tick();
  const saving = api.saveNow(); await tick();
  const switching = api.openDocument(B); await tick();
  assert(api.docId !== B, 'Switched before the outstanding save completed');
  request.resolve({ data: { id: A }, error: null });
  await saving; await switching; await tick();
  assert(api.docId === B, 'Old save hijacked the new document');
  assert(api.doc.vertices[0].x === 10, 'Wrong document content');
});
await test('New drawing waits for an in-flight update', async () => {
  await mount(A);
  const request = deferred();
  backend.update = () => request.promise;
  api.setDoc(drawing(30)); await tick();
  const saving = api.saveNow(); await tick();
  const creating = api.newDocument(); await tick();
  assert(api.docId === A, 'New document replaced an active save');
  request.resolve({ data: row(A), error: null });
  await saving; await creating; await tick();
  assert(api.docId === null && api.doc.vertices.length === 0, 'New drawing was not blank');
  assert(readDraft(A).doc.vertices[0].x === 30, 'Previous drawing lost its local edits');
});
await test('Forgetting a deleted document does not save it again', async () => {
  await mount(A);
  let writes = 0;
  backend.update = async () => { writes++; return { data: row(A), error: null }; };
  api.setDoc(drawing(40)); await tick();
  api.forgetDocument(A); await tick();
  assert(writes === 0, 'Deleted document was written again');
  assert(api.docId === null, 'Deleted drawing remains selected');
});
await test('Anonymous drawings remain independent after New drawing and reopen', async () => {
  await mount(null, () => {}, null);
  api.setDoc(drawing(77)); await tick(); await api.saveNow(); await tick();
  const first = listLocalDocuments()[0];
  assert(first && first.doc.vertices[0].x === 77, 'First drawing not archived');
  await api.newDocument(); await tick();
  api.setDoc(drawing(99)); await tick(); await api.saveNow(); await tick();
  const entries = listLocalDocuments();
  assert(entries.length === 2, 'New drawing replaced the earlier document');
  const stored = Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]));
  api = null;
  await mount(null, () => { for (const [k, v] of Object.entries(stored)) localStorage.setItem(k, v); history.replaceState({}, '', '?local=' + first.id); }, null);
  assert(api.doc.vertices[0].x === 77, 'Opening the first local drawing loaded the wrong content');
});
await test('Clearing a local drawing persists its empty state', async () => {
  await mount(null, () => {}, null);
  api.setDoc(drawing(77)); await tick(); await api.saveNow();
  api.setDoc(emptyDoc()); await tick(); await api.saveNow();
  assert(listLocalDocuments()[0].doc.vertices.length === 0, 'Archive retained erased chemistry');
});
await test('Storage failure is visible and prevents discarding unsaved edits', async () => {
  await mount(null, () => {}, null);
  const original = Storage.prototype.setItem;
  try {
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    api.setDoc(drawing(123)); await tick(); await api.saveNow(); await tick();
    assert(api.status === 'storage-error', 'Failed local save reported success');
    const result = await api.newDocument(); await tick();
    assert(result?.error && api.doc.vertices[0].x === 123, 'Unsaved drawing was discarded');
  } finally { Storage.prototype.setItem = original; }
});
root?.unmount();
window.__testResults = results;
document.body.textContent = JSON.stringify(results, null, 2);
