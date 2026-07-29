/**
 * Local-storage mirror of the open document.
 *
 * This is the crash net that makes reloading safe: every edit is written here
 * (throttled) regardless of whether the user is signed in, so closing the tab —
 * or losing the network right before the debounced cloud save fires — never
 * loses work. On the next load, whichever copy is newer wins.
 *
 * The homepage reads `openreactions.lastDocId` and `openreactions.draft.local`
 * directly to offer "continue where you left off", so these key names and shapes
 * are a small contract with index.html.
 */
import { DEFAULT_TITLE, normalizeDoc } from './docModel.js';

const PREFIX = 'openreactions.draft.';
const LAST_KEY = 'openreactions.lastDocId';

/** Drafts kept before the oldest are pruned. Enough for a few open tabs. */
const MAX_DRAFTS = 8;

/** Key for the not-yet-in-the-cloud document (signed out, or brand new). */
export const LOCAL_DOC_KEY = 'local';

const store = () => {
  try {
    // Safari private mode throws on access, not just on write.
    const s = window.localStorage;
    const probe = '__or_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
};

const keyFor = (docKey) => `${PREFIX}${docKey || LOCAL_DOC_KEY}`;

/** @returns {{title: string, doc: object, updatedAt: string, thumbnail: string|null}|null} */
export function readDraft(docKey) {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(keyFor(docKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title || DEFAULT_TITLE,
      doc: normalizeDoc(parsed.doc),
      updatedAt: parsed.updatedAt || null,
      thumbnail: parsed.thumbnail || null,
    };
  } catch {
    return null;
  }
}

export function writeDraft(docKey, { title, doc, thumbnail = null, updatedAt = null }) {
  const s = store();
  if (!s) return;
  const payload = JSON.stringify({
    title: title || DEFAULT_TITLE,
    doc,
    thumbnail,
    updatedAt: updatedAt || new Date().toISOString(),
  });
  try {
    s.setItem(keyFor(docKey), payload);
  } catch {
    // Out of quota: drop the thumbnails (much the largest part) and retry once,
    // because keeping the geometry matters far more than keeping the preview.
    pruneDrafts(1);
    try {
      s.setItem(keyFor(docKey), JSON.stringify({ title, doc, thumbnail: null, updatedAt: new Date().toISOString() }));
    } catch {
      /* give up silently — the cloud save is still the primary path */
    }
  }
}

export function deleteDraft(docKey) {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(keyFor(docKey));
  } catch {
    /* ignore */
  }
}

/**
 * Moves the anonymous draft onto a real document id, which is what happens the
 * moment a signed-in user's first edit gets a row in the database.
 */
export function promoteLocalDraft(newDocKey) {
  const draft = readDraft(LOCAL_DOC_KEY);
  if (!draft) return;
  writeDraft(newDocKey, draft);
  deleteDraft(LOCAL_DOC_KEY);
}

export function getLastDocId() {
  const s = store();
  if (!s) return null;
  try {
    return s.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function setLastDocId(docKey) {
  const s = store();
  if (!s) return;
  try {
    if (docKey) s.setItem(LAST_KEY, docKey);
    else s.removeItem(LAST_KEY);
  } catch {
    /* ignore */
  }
}

/** Keeps local storage from growing without bound as documents pile up. */
export function pruneDrafts(keep = MAX_DRAFTS) {
  const s = store();
  if (!s) return;
  try {
    const entries = [];
    for (let i = 0; i < s.length; i += 1) {
      const key = s.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      let updatedAt = '';
      try {
        updatedAt = JSON.parse(s.getItem(key))?.updatedAt || '';
      } catch {
        /* corrupt entry sorts oldest and gets pruned first */
      }
      entries.push({ key, updatedAt });
    }
    if (entries.length <= keep) return;
    entries.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    entries.slice(keep).forEach((e) => s.removeItem(e.key));
  } catch {
    /* ignore */
  }
}
