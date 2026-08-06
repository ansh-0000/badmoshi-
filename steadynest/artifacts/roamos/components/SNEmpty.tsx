import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';

// ── SNEmpty ───────────────────────────────────────────────────────────────────
// Shared empty state (SNEmpty.dc.html). Only `title` is required; the icon well,
// body, both CTAs and the mono meta line are all optional and collapse when the
// prop is absent, so one component covers "no results yet", "nothing to do" and
// "something needs setting up" without per-screen variants.

const DEFAULT_ICON = 'M3 3v18h18M7 16l4-6 3 4 4-7';

export type SNEmptyProps = {
  title: string;
  body?: string;
  cta?: string;
  onCta?: () => void;
  cta2?: string;
  onCta2?: () => void;
  meta?: string;
  /** SVG path data drawn in a 24×24 viewBox. */
  iconPath?: string;
};

export function SNEmpty({
  title,
  body,
  cta,
  onCta,
  cta2,
  onCta2,
  meta,
  iconPath = DEFAULT_ICON,
}: SNEmptyProps) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWell, { backgroundColor: colors.primaryTint + '12' }]}>
        <Svg width={34} height={34} viewBox="0 0 24 24" fill="none">
          <Path
            d={iconPath}
            // primaryTint: the glyph sits on the page background, where plain
            // Moss is 1.98:1 in dark mode.
            stroke={colors.primaryTint}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

      {!!body && <Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text>}

      {!!cta && (
        <Pressable
          onPress={onCta}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>{cta}</Text>
        </Pressable>
      )}

      {!!cta2 && (
        <Pressable
          onPress={onCta2}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta2,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { color: colors.foreground }]}>{cta2}</Text>
        </Pressable>
      )}

      {!!meta && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{meta}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingHorizontal: 26,
    paddingBottom: 46,
    width: '100%',
  },
  iconWell: {
    width: 82,
    height: 82,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
    letterSpacing: -0.24, // -0.01em at 24px
    lineHeight: 28.8, // 1.2
    textAlign: 'center',
    marginBottom: 11,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21.7, // 1.55
    textAlign: 'center',
    maxWidth: 262,
    marginBottom: 28,
  },
  cta: {
    width: '100%',
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    // 0 12px 28px -12px — RN has no spread, so the offset/radius are matched
    // and opacity carries the -12px inset visually.
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  cta2: {
    width: '100%',
    borderRadius: 9999,
    borderWidth: 1.5,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ctaText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  meta: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10.5,
    letterSpacing: 0.21, // 0.02em
    marginTop: 20,
    textAlign: 'center',
  },
});
