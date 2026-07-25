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
  const palette = activeScheme === 'dark' ? colors.dark : colors.light;
  
  return { ...palette, radius: colors.radius };
}
