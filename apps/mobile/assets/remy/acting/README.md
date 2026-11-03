# Remy minor expressions

These transparent PNG atlases extend the six original Remy poses in the parent directory. Generated using the built-in image generation tool, with the original art as the identity reference. Original PNGs remain static/loading fallbacks.

Every atlas is 1536×1024: three columns, two rows, six 512×512 cells in row-major order.

- Main poses: rest, half blink, closed blink, attentive glance, look away, small wrist gesture.
- `remy-privacy-atlas.png`: six stages from hand down to both eyes covered. The same sequence reverses on blur.
- `remy-peek-atlas.png`: six stages from covered to one eye peeking above the hand. Reverses when the password is hidden.

The runtime clips a single cell and animates the atlas position using Reanimated. Most time is stillness, with unevenly spaced short expressions. Tiny logos keep the original artwork. Reduced motion holds a static expression; focus reactions still communicate the current state without animated travel.

`src/ui/remyGeometry.ts` records alpha bounds and foot centers from every cell and original image. Each is fitted to 88% of the slot height, with the feet centered at 93% of the slot height. This corrects transparent canvas differences so poses do not grow or drift when switching. Both auth screens use the same 88-point slot; the entrance fades/lifts without scaling.

Clip the individual source cell before transforming it into position. The final display slot permits overflow: a wider hand can extend past the nominal slot without being cut off, while neighboring atlas cells remain hidden.

Exact prompts: [main poses and cover sequence](prompts.json), [peek sequence](peek-prompt.txt). Actual native UI screenshots and recording: [validation](../../../validation/remy/README.md).
