import { useWindowDimensions } from 'react-native';

/**
 * Base design dimensions (iPhone 14 / 390 × 844).
 * All current hardcoded values in the screens were authored for this size.
 */
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Returns scaling helpers that map design-pixel values to the current screen.
 *
 *  wp(n) — width-proportional (paddings, margins, widths, border-radius, gaps)
 *  hp(n) — height-proportional  (vertical heights, margins, paddings)
 *  fp(n) — font-proportional    (font sizes, icon sizes — uses a moderate factor
 *          so text doesn't blow up on very wide tablets)
 *  isTablet — true when the shorter dimension ≥ 600 dp (common tablet breakpoint)
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scaleW = width / BASE_WIDTH;
  const scaleH = height / BASE_HEIGHT;

  /** Width-proportional */
  const wp = (size: number) => Math.round(size * scaleW);

  /** Height-proportional */
  const hp = (size: number) => Math.round(size * scaleH);

  /**
   * Font / icon proportional — uses the *smaller* of the two scale
   * factors capped at 1.6× so tablet text stays readable, not enormous.
   */
  const fp = (size: number) => {
    const scale = Math.min(scaleW, scaleH, 1.6);
    return Math.round(size * scale);
  };

  const isTablet = Math.min(width, height) >= 600;

  /**
   * Maximum content width for tablets — keeps the form from stretching
   * edge-to-edge on a 12.9″ iPad.
   */
  const maxFormWidth = isTablet ? Math.min(width * 0.6, 540) : width;

  return { wp, hp, fp, isTablet, maxFormWidth, width, height };
}
