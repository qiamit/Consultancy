/**
 * When parent notes briefly go empty (late hydrate / debounce race), keep the
 * in-progress local document instead of wiping the open editor.
 */
export function preferLocalDocumentIfStoredEmpty<T>(
  stored: T,
  prev: T,
  hasContent: (doc: T) => boolean,
  mapStored: (stored: T) => T = (value) => value,
): T {
  if (!hasContent(stored) && hasContent(prev)) return prev;
  return mapStored(stored);
}
