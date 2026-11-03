/** Adds `draft` to `items` unless it is blank or already listed (case-insensitive). */
export function withDraft(items: string[], draft: string) {
  const v = draft.trim();
  return v && !items.some((i) => i.toLowerCase() === v.toLowerCase()) ? [...items, v] : items;
}
