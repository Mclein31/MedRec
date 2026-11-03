/** Alpha bounds and foot centers measured from checked-in art (threshold 24/255).
 * Fit visible height and plant the feet; moving hands must not shift the body center.
 * Keep these measurements in sync when replacing artwork.
 */
export type SpriteBounds = readonly [left: number, top: number, right: number, bottom: number, footCenter: number];
export const ATLAS_BOUNDS = {
  curious: [[38, 39, 496, 459, 257.0], [38, 39, 496, 459, 257.0], [38, 39, 496, 459, 257.0], [38, 39, 496, 459, 257.0], [38, 39, 496, 459, 257.0], [38, 39, 487, 459, 257.0]],
  default: [[40, 24, 501, 456, 258.0], [40, 24, 501, 456, 258.5], [40, 24, 501, 456, 258.5], [40, 24, 501, 456, 258.0], [40, 24, 501, 456, 258.0], [40, 24, 501, 456, 258.5]],
  greeting: [[51, 39, 496, 444, 257.0], [51, 39, 496, 444, 256.5], [51, 40, 496, 444, 257.0], [51, 40, 495, 444, 256.5], [51, 40, 496, 444, 256.5], [51, 40, 491, 444, 257.0]],
  peek: [[36, 20, 459, 454, 261.5], [36, 20, 459, 455, 263.0], [36, 20, 459, 454, 261.5], [36, 21, 459, 455, 262.5], [36, 21, 459, 455, 262.5], [36, 21, 459, 455, 262.5]],
  privacy: [[37, 16, 503, 454, 263.5], [37, 16, 475, 454, 263.5], [38, 16, 457, 454, 263.5], [37, 17, 456, 454, 263.0], [37, 17, 456, 454, 263.0], [38, 17, 457, 454, 263.0]],
  reading: [[64, 11, 475, 458, 268.5], [64, 11, 475, 458, 268.5], [64, 11, 475, 458, 268.5], [64, 11, 475, 458, 268.5], [64, 11, 475, 458, 268.0], [64, 11, 475, 458, 268.5]],
  saved: [[46, 21, 496, 447, 252.0], [46, 21, 496, 447, 252.5], [47, 21, 496, 447, 252.5], [46, 21, 496, 447, 252.0], [46, 21, 496, 447, 252.5], [46, 21, 495, 447, 252.5]],
  searching: [[30, 18, 483, 450, 258.5], [30, 18, 483, 451, 258.5], [30, 18, 483, 450, 258.5], [30, 18, 483, 451, 258.5], [30, 19, 483, 451, 258.5], [31, 19, 483, 451, 258.5]]
} as const;
export const ORIGINAL_BOUNDS = {
  curious: [50, 74, 591, 549, 311.5],
  default: [45, 62, 592, 560, 308.0],
  greeting: [52, 60, 595, 550, 294.0],
  reading: [69, 56, 546, 552, 306.0],
  saved: [61, 64, 591, 551, 302.5],
  searching: [49, 53, 577, 552, 316.0]
} as const;

export function fittedSprite(bounds: SpriteBounds, size: number, index = 0, cell = 512) {
  'worklet';
  const [, top, , bottom, footCenter] = bounds;
  const scale = size * 0.88 / (bottom - top);
  return {
    scale,
    x: size / 2 - ((index % 3) * cell + footCenter) * scale,
    y: size * 0.93 - (Math.floor(index / 3) * cell + bottom) * scale,
  };
}
