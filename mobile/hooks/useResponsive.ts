import { useWindowDimensions } from 'react-native';

/**
 * Base design dimensions — iPhone 14 Plus (428 × 926 pt).
 * The original hardcoded pixel values in login/register were authored
 * to fit this screen without scrolling.
 */
const BASE_WIDTH = 428;
const BASE_HEIGHT = 926;

/**
 * Returns scaling helpers that map design-pixel values to the current screen.
 *
 *  wp(n) — width-proportional  (paddings, margins, widths, border-radius, gaps)
 *  hp(n) — height-proportional (vertical heights, margins, paddings)
 *  fp(n) — font-proportional   (font sizes, icon sizes)
 *  isTablet — true when the shorter dimension ≥ 600 dp
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const rawScaleW = width / BASE_WIDTH;
  const rawScaleH = height / BASE_HEIGHT;

  const isTablet = Math.min(width, height) >= 600;

  /**
   * On phones the scale is capped at 1.0 — elements keep the original
   * design sizes as their maximum and shrink on smaller screens.
   * On tablets the cap is raised so the UI grows gracefully.
   */
  const cap = isTablet ? 1.6 : 1.0;

  const scaleW = Math.min(rawScaleW, cap);
  const scaleH = Math.min(rawScaleH, cap);

  /** Width-proportional */
  const wp = (size: number) => Math.round(size * scaleW);

  /** Height-proportional */
  const hp = (size: number) => Math.round(size * scaleH);

  /**
   * Font / icon proportional — uses the *smaller* of the two scale
   * factors so text stays balanced across different aspect ratios.
   */
  const fp = (size: number) => {
    const scale = Math.min(scaleW, scaleH);
    return Math.round(size * scale);
  };

  /**
   * Maximum content width for tablets — keeps the form from stretching
   * edge-to-edge on a 12.9″ iPad.
   */
  const maxFormWidth = isTablet ? Math.min(width * 0.6, 540) : width;

  return { wp, hp, fp, isTablet, maxFormWidth, width, height };
}
