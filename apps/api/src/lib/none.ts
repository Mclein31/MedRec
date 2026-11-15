/** Explicit "nothing to list" answers the app saves as a list's only item (mirrors apps/mobile/src/listDraft.ts). */
const NONE_VALUES = ['No known allergies', 'No known conditions', 'No current medications'];

export function saysNone(items: string[]) {
  return items.length === 1 && NONE_VALUES.includes(items[0]!);
}
