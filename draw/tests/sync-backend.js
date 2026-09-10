export const isSupabaseConfigured = true;
export const backend = { fetch: null, create: null, update: null };
export const fetchDrawing = (...args) => backend.fetch(...args);
export const createDrawing = (...args) => backend.create(...args);
export const updateDrawing = (...args) => backend.update(...args);
