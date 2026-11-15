/**
 * Adds `draft` to `items` unless it is blank or already listed (case-insensitive).
 * `none` is the list's explicit "nothing to list" entry (e.g. "No known allergies"): a real item replaces it.
 */
export function withDraft(items: string[], draft: string, none?: string) {
  const v = draft.trim();
  if (!v || items.some((i) => i.toLowerCase() === v.toLowerCase())) return items;
  return [...(none ? items.filter((i) => i !== none) : items), v];
}

/** True when the list says "none" explicitly, as opposed to simply not being filled in. */
export function isNone(items: string[], none: string) {
  return items.length === 1 && items[0] === none;
}

/** Explicit "nothing to list" answers, saved as a list's only item. Shared by the editor and every place lists are shown. */
export const NONE = { allergies: 'No known allergies', conditions: 'No known conditions', medications: 'No current medications' } as const;
const NONE_VALUES: string[] = Object.values(NONE);

/** True when a list holds only an explicit "none" answer, so it shouldn't be styled as an alert. */
export function saysNone(items: string[]) {
  return items.length === 1 && NONE_VALUES.includes(items[0]!);
}
