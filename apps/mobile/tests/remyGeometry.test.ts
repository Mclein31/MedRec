import assert from 'node:assert/strict';
import test from 'node:test';
import { ATLAS_BOUNDS, fittedSprite, ORIGINAL_BOUNDS, type SpriteBounds } from '../src/ui/remyGeometry.ts';

function checkFit(bounds: SpriteBounds, size: number, index: number, cell: number) {
  const fit = fittedSprite(bounds, size, index, cell);
  const [, top, , bottom, footCenter] = bounds;
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.000001);
  near((bottom - top) * fit.scale, size * 0.88);
  near(fit.y + (Math.floor(index / 3) * cell + bottom) * fit.scale, size * 0.93);
  near(fit.x + ((index % 3) * cell + footCenter) * fit.scale, size / 2);
}

test('every pose and reaction frame has the same visible height and planted foot center', () => {
  for (const size of [32, 88, 120, 240]) {
    for (const frames of Object.values(ATLAS_BOUNDS)) frames.forEach((bounds, index) => checkFit(bounds, size, index, 512));
    for (const bounds of Object.values(ORIGINAL_BOUNDS)) checkFit(bounds, size, 0, 600);
  }
});
