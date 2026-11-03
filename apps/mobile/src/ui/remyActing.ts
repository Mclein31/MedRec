/** Fixed atlas cells; only the face/wrist changes between these registered drawings. */
export const REMY_FRAME = { rest: 0, halfBlink: 1, blink: 2, attentive: 3, glance: 4, gesture: 5 } as const;
export type RemyAttention = 'idle' | 'form' | 'private' | 'peek' | 'busy';
export type RemyPose = 'default' | 'greeting' | 'curious' | 'searching' | 'reading' | 'saved';
export type RemyMotion = 'idle' | 'wave' | 'hop' | 'read' | 'search' | 'cheer' | 'peek' | 'none';
export const ACTING_CYCLE_MS = 30_000;

/** Close → hold → open, rather than a one-frame wink. Returns null outside the blink. */
export function blinkFrame(ms: number): number | null {
  'worklet';
  if (ms < 0 || ms >= 230) return null;
  return ms < 65 || ms >= 155 ? REMY_FRAME.halfBlink : REMY_FRAME.blink;
}

/**
 * Most time is stillness. Uneven blinks, a brief glance, and occasional small gestures.
 * No typing content is read: attention is only a focus/busy signal from the form.
 */
export function minorFrameAt(ms: number, pose: RemyPose, motion: RemyMotion, attention: RemyAttention = 'idle', seed = 0): number {
  'worklet';
  if (motion === 'none' || attention === 'private' || attention === 'peek') return REMY_FRAME.rest;
  const time = ((ms + seed) % ACTING_CYCLE_MS + ACTING_CYCLE_MS) % ACTING_CYCLE_MS;
  for (const start of [2350, 6850, 7140, 12_800, 18_100, 25_300]) {
    const blink = blinkFrame(time - start);
    if (blink !== null) return blink;
  }
  if (attention === 'form' || attention === 'busy' || motion === 'read') return REMY_FRAME.attentive;
  // One short wrist greeting near arrival, then a long quiet interval.
  if (pose === 'greeting' && time >= 600 && time < 1520) {
    return Math.floor((time - 600) / 230) % 2 === 0 ? REMY_FRAME.gesture : REMY_FRAME.rest;
  }
  if (time >= 10_200 && time < 10_850) return REMY_FRAME.gesture;
  if (time >= 15_100 && time < 16_050) return REMY_FRAME.attentive;
  if (time >= 21_500 && time < 22_350) return REMY_FRAME.glance;
  return REMY_FRAME.rest;
}

/** Six actual arm drawings run forwards on focus, backwards on blur; held at the covered pose. */
export function privacyFrameAt(progress: number): number {
  'worklet';
  return Math.max(0, Math.min(5, Math.round(progress * 5)));
}

export function actingSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 650;
}

/** Password focus outranks submission; visibility controls only the playful hand/eye state. */
export function formAttention(focus: RemyAttention, busy: boolean, passwordVisible: boolean): RemyAttention {
  if (focus === 'private') return passwordVisible ? 'peek' : 'private';
  return busy ? 'busy' : focus;
}
