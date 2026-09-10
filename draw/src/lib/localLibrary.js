import { isDocEmpty, contentFingerprint } from './docModel.js';
const PREFIX = 'openreactions.localDocument.';
const CURRENT = 'openreactions.localDocumentId';
const VERSION_PREFIX = 'openreactions.versions.';
export function currentLocalId() {
  let id = localStorage.getItem(CURRENT);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(CURRENT, id); }
  return id;
}
export function startLocalDocument() { const id = crypto.randomUUID(); localStorage.setItem(CURRENT, id); return id; }
export function readLocalDocument(id) {
  try { return JSON.parse(localStorage.getItem(PREFIX + id) || 'null'); } catch { return null; }
}
export function adoptLocalDocument(id) {
  const entry = readLocalDocument(id);
  if (!entry || entry.deletedAt) return null;
  localStorage.setItem(CURRENT, id);
  return entry;
}
export function listLocalDocuments(includeTrash = false) {
  try {
    return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => ({ id: k.slice(PREFIX.length), ...JSON.parse(localStorage.getItem(k)) })).filter(d => includeTrash ? d.deletedAt : !d.deletedAt).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  } catch { return []; }
}
export function saveLocalDocument(payload, id = currentLocalId()) {
  if (isDocEmpty(payload.doc) && !readLocalDocument(id)) return;
  localStorage.setItem(CURRENT, id);
  localStorage.setItem(PREFIX + id, JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }));
}
export function recordVersion(key, payload) {
  try {
    if (isDocEmpty(payload.doc)) return;
    const versions = JSON.parse(localStorage.getItem(VERSION_PREFIX + key) || '[]');
    const last = versions[0];
    if (last && last.title === payload.title && contentFingerprint(last.doc) === contentFingerprint(payload.doc)) return;
    // Retain one checkpoint per minute plus the newest state, not every keystroke.
    if (versions.length > 1 && Date.now() - Date.parse(versions[0].updatedAt) < 60000) versions.shift();
    versions.unshift({ ...payload, updatedAt: new Date().toISOString() });
    localStorage.setItem(VERSION_PREFIX + key, JSON.stringify(versions.slice(0, 20)));
  } catch { /* Version history is secondary to the current draft. */ }
}
export function readVersions(key) { try { return JSON.parse(localStorage.getItem(VERSION_PREFIX + key) || '[]'); } catch { return []; } }

/** A deleted cloud document can be restored as a new local document on this device. */
export function archiveDeletedDocument(id, payload) {
  const recoveryId = crypto.randomUUID();
  localStorage.setItem(PREFIX + recoveryId, JSON.stringify({ ...payload, sourceId: id, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
  return recoveryId;
}
export function restoreDeletedDocument(id) {
  const entry = readLocalDocument(id);
  if (!entry?.deletedAt) throw new Error('That drawing is not in browser trash.');
  const { deletedAt, ...restored } = entry;
  localStorage.setItem(PREFIX + id, JSON.stringify(restored));
  return id;
}
