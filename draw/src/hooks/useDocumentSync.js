/**
 * Google-Docs-style persistence for the drawing.
 *
 * Two layers, because they fail in different ways:
 *
 *  1. **Local storage** is written on every edit. It's what makes a reload — or a
 *     crash, or a closed laptop — never lose work, and it's the only layer when
 *     nobody is signed in.
 *  2. **Supabase** is written on a short debounce, so a drawing follows the user
 *     between devices and shows up on the homepage.
 *
 * Rules that keep it predictable:
 *  - A row is created lazily, on the first edit that leaves the canvas non-empty.
 *    Opening the editor and closing it again doesn't litter the account with
 *    empty "Untitled drawing" rows.
 *  - Panning and zooming are not edits: they're saved, but they never trigger a
 *    network write on their own (see contentFingerprint).
 *  - On load, whichever copy is newer wins — a local draft that never made it to
 *    the server is pushed up rather than being overwritten by a stale row.
 *  - `?doc=<id>` in the URL is the address of a drawing, kept in sync with
 *    replaceState so reloading and the back button both land in the right place.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { DEFAULT_TITLE, contentFingerprint, emptyDoc, isDocEmpty, normalizeDoc } from '../lib/docModel.js';
import { createDrawing, fetchDrawing, updateDrawing } from '../lib/documents.js';
import {
  LOCAL_DOC_KEY,
  deleteDraft,
  getLastDocId,
  promoteLocalDraft,
  pruneDrafts,
  readDraft,
  setLastDocId,
  writeDraft,
} from '../lib/localDoc.js';

/** How long after the last edit the cloud write fires. */
const SAVE_DEBOUNCE_MS = 1200;
/** Thumbnails cost two canvas redraws and a PNG encode, so rate-limit them. */
const THUMBNAIL_MIN_INTERVAL_MS = 8000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readDocIdFromUrl = () => {
  try {
    const id = new URL(window.location.href).searchParams.get('doc');
    return id && UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
};

/**
 * `?new=1` — how the homepage's "New drawing" tile asks for a blank canvas
 * instead of resuming whatever was open last.
 */
const wantsNewDocument = () => {
  try {
    return new URL(window.location.href).searchParams.get('new') === '1';
  } catch {
    return false;
  }
};

const writeDocIdToUrl = (id, { replace = true } = {}) => {
  try {
    const url = new URL(window.location.href);
    const hadNewFlag = url.searchParams.has('new');
    if (!hadNewFlag && url.searchParams.get('doc') === (id || null)) return;
    // `new=1` is a one-shot instruction; drop it so a reload doesn't discard the
    // drawing the user has since made.
    url.searchParams.delete('new');
    if (id) url.searchParams.set('doc', id);
    else url.searchParams.delete('doc');
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (replace) window.history.replaceState({}, '', next);
    else window.history.pushState({}, '', next);
  } catch {
    /* history is unavailable in some embedded contexts; not worth failing over */
  }
};

const isNewer = (a, b) => {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return Number.isFinite(ta) && Number.isFinite(tb) && ta > tb;
};

/**
 * Does the local mirror hold work the server hasn't got?
 *
 * Timestamps alone aren't enough: the draft is rewritten on events that change
 * nothing (signing out, closing the tab), and treating those as unsaved edits
 * would push a pointless write and bump `updated_at`, shuffling the drawing to
 * the top of "recent" for no reason.
 */
const draftIsAhead = (draft, row) => {
  if (!draft || !isNewer(draft.updatedAt, row.updated_at)) return false;
  if ((draft.title || DEFAULT_TITLE) !== (row.title || DEFAULT_TITLE)) return true;
  return contentFingerprint(draft.doc) !== contentFingerprint(normalizeDoc(row.data));
};

/**
 * @param {object} params
 * @param {object} params.doc            Current document, rebuilt on every edit.
 * @param {(doc: object) => void} params.applyDoc  Loads a document into the canvas.
 * @param {string|null} params.userId    Signed-in user, or null.
 * @param {boolean} params.authLoading   True until the session is known.
 * @param {() => string|null} params.captureThumbnail  Small PNG of the drawing.
 */
export function useDocumentSync({ doc, applyDoc, userId, authLoading, captureThumbnail }) {
  const [docId, setDocId] = useState(null);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  // 'loading' | 'clean' | 'dirty' | 'saving' | 'saved' | 'local' | 'error'
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [ready, setReady] = useState(false);

  // Refs mirror the state the async save path needs, so the debounced timer
  // always sends the freshest values without being recreated on every keystroke.
  const docRef = useRef(doc);
  const titleRef = useRef(title);
  const docIdRef = useRef(null);
  const userIdRef = useRef(userId);
  const readyRef = useRef(false);
  const savedFingerprintRef = useRef(null);
  const savedTitleRef = useRef(null);
  const saveTimerRef = useRef(null);
  const inFlightRef = useRef(false);
  const rerunRef = useRef(false);
  const lastThumbAtRef = useRef(0);
  const captureThumbnailRef = useRef(captureThumbnail);
  const applyDocRef = useRef(applyDoc);

  docRef.current = doc;
  titleRef.current = title;
  userIdRef.current = userId;
  captureThumbnailRef.current = captureThumbnail;
  applyDocRef.current = applyDoc;

  const draftKey = docId || LOCAL_DOC_KEY;

  /** Writes the local mirror. Cheap enough to call on any change. */
  const mirrorLocally = useCallback((key) => {
    writeDraft(key ?? (docIdRef.current || LOCAL_DOC_KEY), {
      title: titleRef.current,
      doc: docRef.current,
    });
  }, []);

  const maybeThumbnail = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastThumbAtRef.current < THUMBNAIL_MIN_INTERVAL_MS) return null;
    const thumb = captureThumbnailRef.current?.() ?? null;
    if (thumb) lastThumbAtRef.current = now;
    return thumb;
  }, []);

  /** The actual write. Serialized: a save in flight queues one re-run. */
  const performSave = useCallback(async () => {
    if (inFlightRef.current) {
      rerunRef.current = true;
      return;
    }
    const snapshot = docRef.current;
    const snapshotTitle = titleRef.current;
    const fingerprint = contentFingerprint(snapshot);
    const uid = userIdRef.current;

    // Signed out (or no backend): the local mirror is the whole story.
    if (!isSupabaseConfigured || !uid) {
      savedFingerprintRef.current = fingerprint;
      savedTitleRef.current = snapshotTitle;
      setStatus('local');
      return;
    }

    // Nothing has changed since the last successful write. The debounced path
    // already checks this; saveNow (title commits, tab hide, sign-out, Cmd+S)
    // doesn't, and firing a redundant request there is how a clean document
    // ended up reporting a save error when its request raced a sign-out.
    if (fingerprint === savedFingerprintRef.current && snapshotTitle === savedTitleRef.current) return;

    // Never create a row for a canvas nobody has drawn on yet.
    if (!docIdRef.current && isDocEmpty(snapshot)) {
      savedFingerprintRef.current = fingerprint;
      savedTitleRef.current = snapshotTitle;
      setStatus('clean');
      return;
    }

    inFlightRef.current = true;
    setStatus('saving');
    // A request that outlives the session it was made for must not report
    // anything: signing out revokes the token mid-flight, and a 401 arriving
    // after the switch to local saving would show a scary error for a document
    // that is, in fact, safely stored.
    const stale = () => userIdRef.current !== uid;
    try {
      if (!docIdRef.current) {
        const { data, error: createError } = await createDrawing({
          userId: uid,
          title: snapshotTitle,
          doc: snapshot,
          thumbnail: maybeThumbnail(true),
        });
        if (stale()) return;
        if (createError) {
          setError(createError);
          setStatus('error');
          return;
        }
        docIdRef.current = data.id;
        setDocId(data.id);
        // The work so far was mirrored under the anonymous key; move it across so
        // there's exactly one local copy of this document.
        promoteLocalDraft(data.id);
        setLastDocId(data.id);
        writeDocIdToUrl(data.id);
      } else {
        const patch = { title: snapshotTitle, data: snapshot };
        const thumb = maybeThumbnail();
        if (thumb) patch.thumbnail = thumb;
        const { data, error: updateError } = await updateDrawing(docIdRef.current, patch);
        if (stale()) return;
        if (updateError) {
          setError(updateError);
          setStatus('error');
          return;
        }
        if (!data) {
          // The row is gone (deleted elsewhere). Re-create rather than silently
          // dropping the user's work.
          docIdRef.current = null;
          setDocId(null);
          rerunRef.current = true;
          return;
        }
      }
      savedFingerprintRef.current = fingerprint;
      savedTitleRef.current = snapshotTitle;
      setError(null);
      setLastSavedAt(new Date().toISOString());
      setStatus('saved');
    } catch (e) {
      if (stale()) return;
      setError(e?.message || 'Could not save.');
      setStatus('error');
    } finally {
      inFlightRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        performSave();
      }
    }
  }, [maybeThumbnail]);

  /**
   * Skip the debounce — used by the title field, tab-hide, Cmd+S and sign-out.
   * Returns the write so callers that are about to change the world (signing
   * out, switching documents) can wait for it to land.
   */
  const saveNow = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!readyRef.current) return Promise.resolve();
    mirrorLocally();
    return performSave();
  }, [mirrorLocally, performSave]);

  // ---------------------------------------------------------------------------
  // Bootstrap: decide which document is open and load it.
  // ---------------------------------------------------------------------------
  const bootstrappedForRef = useRef(undefined);

  useEffect(() => {
    if (authLoading) return;
    // Re-bootstrap when the signed-in identity changes (sign in, sign out, or a
    // different account), but not on unrelated re-renders.
    const identity = userId || 'anonymous';
    if (bootstrappedForRef.current === identity) return;
    const previousIdentity = bootstrappedForRef.current;
    bootstrappedForRef.current = identity;

    let cancelled = false;

    const finish = ({ id, docTitle, nextDoc, statusValue, fingerprintSaved, updatedAt = null }) => {
      if (cancelled) return;
      docIdRef.current = id;
      setDocId(id);
      setTitle(docTitle);
      if (nextDoc) applyDocRef.current?.(nextDoc);
      savedFingerprintRef.current = fingerprintSaved ? contentFingerprint(nextDoc) : null;
      savedTitleRef.current = fingerprintSaved ? docTitle : null;
      setLastSavedAt(updatedAt);
      setStatus(statusValue);
      setLastDocId(id || LOCAL_DOC_KEY);
      writeDocIdToUrl(id);
      readyRef.current = true;
      setReady(true);
      pruneDrafts();
    };

    /**
     * Opens the copy held in local storage. `keepId` is the document this draft
     * belongs to when we know it (signed out, but still working on a document
     * that exists in the cloud) — keeping the id is what stops a sign-out and
     * back in from cloning the document instead of resuming it.
     */
    const openLocalDraft = (keepId = null) => {
      const draft = readDraft(keepId || LOCAL_DOC_KEY);
      const hasContent = draft && !isDocEmpty(draft.doc);
      finish({
        id: keepId,
        docTitle: draft?.title || DEFAULT_TITLE,
        nextDoc: hasContent ? draft.doc : emptyDoc(),
        // Unsaved local content should get pushed as soon as we're signed in, so
        // leave the saved fingerprint empty to mark it dirty.
        fingerprintSaved: !(userId && hasContent),
        statusValue: isSupabaseConfigured && userId ? 'dirty' : 'local',
      });
    };

    const requested = readDocIdFromUrl();
    const remembered = getLastDocId();
    const rememberedId = remembered && UUID_RE.test(remembered) ? remembered : null;

    // "New drawing" from the homepage: an explicitly blank canvas, no resuming.
    if (wantsNewDocument() && !requested) {
      deleteDraft(LOCAL_DOC_KEY);
      finish({
        id: null,
        docTitle: DEFAULT_TITLE,
        nextDoc: emptyDoc(),
        fingerprintSaved: true,
        statusValue: isSupabaseConfigured && userId ? 'clean' : 'local',
      });
      return () => {
        cancelled = true;
      };
    }

    // Signed out: local storage only.
    if (!isSupabaseConfigured || !userId) {
      // Signing out mustn't wipe the canvas. Keep the document's identity so
      // signing back in re-adopts that same row; the content is mirrored under
      // its own key, and nothing is written to the server while signed out.
      const carriedId =
        (previousIdentity && previousIdentity !== 'anonymous' ? docIdRef.current : null) ||
        // A signed-out reload can also resume a cloud document, as long as this
        // browser still holds its draft.
        ((requested || rememberedId) && readDraft(requested || rememberedId) ? requested || rememberedId : null);

      if (carriedId && previousIdentity && previousIdentity !== 'anonymous') {
        writeDraft(carriedId, { title: titleRef.current, doc: docRef.current });
      }
      openLocalDraft(carriedId);
      return () => {
        cancelled = true;
      };
    }

    const target = requested || rememberedId;

    if (!target) {
      openLocalDraft();
      return () => {
        cancelled = true;
      };
    }

    setStatus('loading');
    (async () => {
      const { data, error: fetchError } = await fetchDrawing(target);
      if (cancelled) return;

      if (fetchError || !data) {
        // Asked for a document that isn't ours or no longer exists. Don't strand
        // the user on an error screen — start them on a fresh drawing.
        if (fetchError && fetchError !== 'not_found') setError(fetchError);
        writeDocIdToUrl(null);
        deleteDraft(target);
        openLocalDraft();
        return;
      }

      // Prefer a local draft that was edited after the server's last write: it
      // holds changes that never made it up (offline, or the tab was closed
      // during the debounce).
      const draft = readDraft(target);
      const localIsNewer = draftIsAhead(draft, data);
      const nextDoc = localIsNewer ? draft.doc : normalizeDoc(data.data);
      const docTitle = (localIsNewer ? draft.title : data.title) || DEFAULT_TITLE;

      finish({
        id: data.id,
        docTitle,
        nextDoc,
        fingerprintSaved: !localIsNewer,
        statusValue: localIsNewer ? 'dirty' : 'saved',
        updatedAt: data.updated_at,
      });

      // Push the recovered local version straight away.
      if (localIsNewer) setTimeout(() => performSave(), 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, performSave]);

  // ---------------------------------------------------------------------------
  // Autosave: mirror locally now, write to the server on a debounce.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ready) return undefined;
    const fingerprint = contentFingerprint(doc);
    const unchanged = fingerprint === savedFingerprintRef.current && title === savedTitleRef.current;
    if (unchanged) return undefined;

    mirrorLocally(draftKey);
    if (isSupabaseConfigured && userId) setStatus((s) => (s === 'saving' ? s : 'dirty'));
    else setStatus('local');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      performSave();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [doc, title, ready, draftKey, userId, mirrorLocally, performSave]);

  // Leaving the tab is the last chance to persist. The local mirror always makes
  // it (synchronous); the network write usually does.
  useEffect(() => {
    const flush = () => {
      if (!readyRef.current) return;
      mirrorLocally();
      const fingerprint = contentFingerprint(docRef.current);
      if (fingerprint !== savedFingerprintRef.current || titleRef.current !== savedTitleRef.current) {
        performSave();
      }
    };
    const onVisibility = () => {
      if (window.document.visibilityState === 'hidden') flush();
    };
    window.document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      window.document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [mirrorLocally, performSave]);

  // ---------------------------------------------------------------------------
  // Switching documents
  // ---------------------------------------------------------------------------

  /** Flushes the current document, then loads another one by id. */
  const openDocument = useCallback(
    async (id) => {
      if (id === docIdRef.current) return { error: null };
      saveNow();
      setStatus('loading');
      const { data, error: fetchError } = await fetchDrawing(id);
      if (fetchError || !data) {
        setError(fetchError === 'not_found' ? 'That drawing no longer exists.' : fetchError);
        setStatus('error');
        return { error: fetchError };
      }
      const draft = readDraft(id);
      const localIsNewer = draftIsAhead(draft, data);
      const nextDoc = localIsNewer ? draft.doc : normalizeDoc(data.data);

      docIdRef.current = data.id;
      setDocId(data.id);
      setTitle((localIsNewer ? draft.title : data.title) || DEFAULT_TITLE);
      applyDocRef.current?.(nextDoc);
      savedFingerprintRef.current = localIsNewer ? null : contentFingerprint(nextDoc);
      savedTitleRef.current = localIsNewer ? null : data.title;
      setLastSavedAt(data.updated_at);
      setStatus(localIsNewer ? 'dirty' : 'saved');
      setLastDocId(data.id);
      writeDocIdToUrl(data.id);
      setError(null);
      return { error: null };
    },
    [saveNow]
  );

  /** Flushes the current document, then starts an empty untitled one. */
  const newDocument = useCallback(() => {
    saveNow();
    const fresh = emptyDoc();
    docIdRef.current = null;
    setDocId(null);
    setTitle(DEFAULT_TITLE);
    applyDocRef.current?.(fresh);
    // A blank document is "already saved" — nothing exists to write yet.
    savedFingerprintRef.current = contentFingerprint(fresh);
    savedTitleRef.current = DEFAULT_TITLE;
    setLastSavedAt(null);
    setStatus(isSupabaseConfigured && userId ? 'clean' : 'local');
    deleteDraft(LOCAL_DOC_KEY);
    setLastDocId(LOCAL_DOC_KEY);
    writeDocIdToUrl(null);
    setError(null);
  }, [saveNow, userId]);

  /**
   * Forgets the open document after it has been deleted elsewhere, leaving the
   * canvas empty rather than re-creating the row on the next keystroke.
   */
  const forgetDocument = useCallback(
    (id) => {
      deleteDraft(id);
      if (id === docIdRef.current) newDocument();
    },
    [newDocument]
  );

  const renameDocument = useCallback((next) => {
    setTitle(next && next.trim() ? next : DEFAULT_TITLE);
  }, []);

  return useMemo(
    () => ({
      docId,
      title,
      setTitle: renameDocument,
      status,
      error,
      lastSavedAt,
      ready,
      saveNow,
      openDocument,
      newDocument,
      forgetDocument,
    }),
    [docId, title, renameDocument, status, error, lastSavedAt, ready, saveNow, openDocument, newDocument, forgetDocument]
  );
}
