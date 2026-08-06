import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Height of the custom bottom tab bar, in dp. Must stay in sync with
 * app/(tabs)/_layout.tsx, which imports this same constant.
 *
 * Sourced from SteadyNest.dc.html's repeated tab-bar block (`height:92px`),
 * identical in every frame.
 */
export const TAB_BAR_HEIGHT = 92;

/**
 * Bottom padding a tab screen needs so its content clears the tab bar.
 *
 * The tab bar is absolutely positioned and overlays screen content, so every
 * scroll container and floating control inside the (tabs) group must reserve
 * this much space at the bottom or it renders *behind* the bar.
 *
 * This replaces a hardcoded `insets.bottom + (Platform.OS === 'web' ? 34 : 90)`
 * that was copy-pasted across screens. That expression reserved only ~34dp on
 * web against a 92dp bar, so ~58dp of content — most visibly Connect's
 * like/pass action buttons — was clipped underneath it. It was also 2dp short
 * on native. Always derive clearance from the real bar height plus the live
 * safe-area inset instead of a guessed number.
 */
export function useTabBarClearance(extra = 16) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + extra;
}
