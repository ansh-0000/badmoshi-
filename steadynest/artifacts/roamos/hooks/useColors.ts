import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';

/**
 * Returns the design tokens for the current color scheme.
 */
export function useColors() {
  const systemScheme = useColorScheme();
  const { theme } = useApp();
  
  const activeScheme = theme === 'system' ? systemScheme : theme;
  const isDark = activeScheme === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  // `isDark` is exposed because a few effects are not symmetric between the
  // palettes. A translucent white lift on a dark surface reads far weaker than
  // the equivalent dark lift on a light one, so anything tuned by eye in light
  // mode needs a different alpha in dark - see SNSkeleton's block tints.
  return { ...palette, radius: colors.radius, isDark };
}
