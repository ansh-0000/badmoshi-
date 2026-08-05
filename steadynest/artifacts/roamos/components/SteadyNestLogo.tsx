import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import colors from '../constants/colors';

const symbol = require('../assets/branding/steadynest-symbol.png');
const appIcon = require('../assets/branding/steadynest-icon.png');

type BrandImageProps = {
  size?: number;
  decorative?: boolean;
};

interface SteadyNestLogoProps extends BrandImageProps {
  variant?: 'symbol' | 'lockup' | 'appIcon' | 'detailed' | 'detailedLockup';
  showSlogan?: boolean;
  theme?: 'light' | 'dark';
}

/** The approved SteadyNest mark, kept as the supplied raster rather than redrawn. */
export function SteadyNestSymbol({ size = 40, decorative = false }: BrandImageProps) {
  return (
    <Image
      source={symbol}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityRole="image"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'SteadyNest'}
    />
  );
}

/** Retained as a compatibility alias for callers that previously selected the detailed mark. */
export function SteadyNestDetailedSymbol(props: BrandImageProps) {
  return <SteadyNestSymbol {...props} />;
}

/** The approved full dark-tile app icon. */
export function SteadyNestAppIcon({ size = 64, decorative = false }: BrandImageProps) {
  return (
    <Image
      source={appIcon}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityRole="image"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : 'SteadyNest'}
    />
  );
}

export default function SteadyNestLogo({
  size = 40,
  variant = 'lockup',
  showSlogan = true,
  theme = 'light',
}: SteadyNestLogoProps) {
  if (variant === 'symbol' || variant === 'detailed') {
    return <SteadyNestSymbol size={size} />;
  }

  if (variant === 'appIcon') {
    return <SteadyNestAppIcon size={size} />;
  }

  const palette = theme === 'dark' ? colors.dark : colors.light;

  return (
    <View style={styles.lockupContainer}>
      <SteadyNestAppIcon size={size} decorative />
      <View style={styles.textColumn}>
        <Text style={[styles.brandTitle, { color: palette.foreground }]}>SteadyNest</Text>
        {showSlogan && (
          <Text style={[styles.brandSlogan, { color: palette.primaryTint }]}>
            Find your place. Stay steady.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textColumn: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  brandSlogan: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
