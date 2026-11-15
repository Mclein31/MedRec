import { Platform } from 'react-native';

/** Hides decoration from screen readers. Web only understands aria-hidden; the native props warn there. */
export const decorative = Platform.OS === 'web'
  ? ({ 'aria-hidden': true } as const)
  : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);
