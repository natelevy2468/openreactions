/**
 * Read/write access to the `drawings` table.
 *
 * Every function resolves to `{ data, error }` (never throws) so the UI can show
 * a save-failed state instead of blowing up mid-drawing. `error` is a plain
 * string ready to display.
 */
import { supabase } from './supabase.js';
import { DEFAULT_TITLE, normalizeDoc } from './docModel.js';

const TABLE = 'drawings';

/** Columns for list views — deliberately excludes `data`, which is large. */
const LIST_COLUMNS = 'id, title, thumbnail, created_at, updated_at';

const describe = (error) => {
  if (!error) return null;
  const message = error.message || String(error);
  // The one failure worth translating: the table/policies were never created.
  if (/relation .* does not exist/i.test(message)) {
    return 'The drawings table is missing — run the SQL from SUPABASE_SETUP.md.';
  }
  if (/permission denied/i.test(message)) {
    return 'Permission denied — check the row level security policies (SUPABASE_SETUP.md).';
  }
  return message;
};

const noBackend = { data: null, error: 'No backend configured.' };

/** Most recently edited drawings for the signed-in user. */
export async function listDrawings(limit = 24) {
  if (!supabase) return noBackend;
  const { data, error } = await supabase
    .from(TABLE)
    .select(LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error: describe(error) };
}

/** One drawing including its document payload. */
export async function fetchDrawing(id) {
  if (!supabase) return noBackend;
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, title, data, thumbnail, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return { data: null, error: describe(error) };
  if (!data) return { data: null, error: 'not_found' };
  return { data: { ...data, data: normalizeDoc(data.data) }, error: null };
}

/**
 * Insert a new row. `user_id` must be sent explicitly: the RLS insert policy
 * checks it against auth.uid(), and there's no column default.
 */
export async function createDrawing({ userId, title = DEFAULT_TITLE, doc, thumbnail = null }) {
  if (!supabase) return noBackend;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, title, data: doc, thumbnail })
    .select(LIST_COLUMNS)
    .single();
  return { data, error: describe(error) };
}

/** Overwrite an existing row. Pass only the fields that changed. */
export async function updateDrawing(id, patch) {
  if (!supabase) return noBackend;
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select(LIST_COLUMNS)
    .single();
  return { data, error: describe(error) };
}

export async function deleteDrawing(id) {
  if (!supabase) return noBackend;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  return { data: true, error: describe(error) };
}

/** Copy a drawing, including its document, under a new title. */
export async function duplicateDrawing({ id, userId }) {
  const { data: source, error } = await fetchDrawing(id);
  if (error) return { data: null, error };
  return createDrawing({
    userId,
    title: `${source.title} (copy)`,
    doc: source.data,
    thumbnail: source.thumbnail,
  });
}
