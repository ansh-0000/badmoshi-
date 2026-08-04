import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

// ── SNTabBar ──────────────────────────────────────────────────────────────────
// One tab bar, two sets of destinations.
//
// The design shipped SNTabBar and SNTabBarLandlord as separate files, but their
// chrome is byte-identical — 92pt, same background, blur, hairline, active
// colour, label metrics — and only the five destinations differ. Building two
// shells would duplicate all of that, and the app has already demonstrated how
// that ends: the landlord tab bar drifted visually from the tenant one because
// it was written separately and shared none of its constants.
//
// Tab ORDER follows the app, not the design file: Tira sits in the centre slot,
// ahead of Chat. Centre is the most prominent position and Tira is the product
// differentiator. The design file is being updated to match so there is one
// source of truth rather than two orders.

export type TabKey =
  | 'stays' | 'connect' | 'tira' | 'chat' | 'profile'
  | 'portfolio' | 'properties' | 'payments';

type TabDef = { key: TabKey; label: string; icon: (p: IconProps) => React.ReactNode };
type IconProps = { color: string; strokeWidth: number };

const stroke = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
});

const Icons = {
  stays: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" {...stroke(color, strokeWidth)} />
      <Circle cx={12} cy={10} r={3} {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  connect: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M16 21v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21" {...stroke(color, strokeWidth)} />
      <Circle cx={9.5} cy={7} r={4} {...stroke(color, strokeWidth)} />
      <Path d="M21 21v-1.5a4 4 0 0 0-3-3.85" {...stroke(color, strokeWidth)} />
      <Path d="M15.5 3.15a4 4 0 0 1 0 7.7" {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  tira: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M12 3l1.6 4.8L18.5 9l-4.9 1.2L12 15l-1.6-4.8L5.5 9l4.9-1.2L12 3Z" {...stroke(color, strokeWidth)} />
      <Path d="M18.5 15.5l.5 1.7 1.7.5-1.7.5-.5 1.7-.5-1.7-1.7-.5 1.7-.5.5-1.7Z" {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  chat: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M21 11.5a8 8 0 0 1-11.5 7.2L3 21l2.3-6.4A8 8 0 1 1 21 11.5Z" {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  profile: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4.2} {...stroke(color, strokeWidth)} />
      <Path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  portfolio: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={7.5} height={7.5} rx={2} {...stroke(color, strokeWidth)} />
      <Rect x={13.5} y={3} width={7.5} height={7.5} rx={2} {...stroke(color, strokeWidth)} />
      <Rect x={3} y={13.5} width={7.5} height={7.5} rx={2} {...stroke(color, strokeWidth)} />
      <Rect x={13.5} y={13.5} width={7.5} height={7.5} rx={2} {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  properties: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M3 21h18M5 21V7l7-4 7 4v14" {...stroke(color, strokeWidth)} />
      <Path d="M9 21v-5h6v5" {...stroke(color, strokeWidth)} />
    </Svg>
  ),
  payments: ({ color, strokeWidth }: IconProps) => (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect x={2.5} y={5} width={19} height={14} rx={3} {...stroke(color, strokeWidth)} />
      <Path d="M2.5 10h19" {...stroke(color, strokeWidth)} />
      <Path d="M6.5 15h4" {...stroke(color, strokeWidth)} />
    </Svg>
  ),
};

export const TENANT_TABS: TabDef[] = [
  { key: 'stays', label: 'Stays', icon: Icons.stays },
  { key: 'connect', label: 'Connect', icon: Icons.connect },
  { key: 'tira', label: 'Tira AI', icon: Icons.tira },
  { key: 'chat', label: 'Chat', icon: Icons.chat },
  { key: 'profile', label: 'Profile', icon: Icons.profile },
];

export const LANDLORD_TABS: TabDef[] = [
  { key: 'portfolio', label: 'Portfolio', icon: Icons.portfolio },
  { key: 'properties', label: 'Properties', icon: Icons.properties },
  { key: 'payments', label: 'Payments', icon: Icons.payments },
  { key: 'tira', label: 'Tira AI', icon: Icons.tira },
  { key: 'profile', label: 'Profile', icon: Icons.profile },
];

export type SNTabBarProps = {
  role?: 'tenant' | 'landlord';
  active: TabKey;
  onSelect?: (key: TabKey) => void;
};

export function SNTabBar({ role = 'tenant', active, onSelect }: SNTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tabs = role === 'landlord' ? LANDLORD_TABS : TENANT_TABS;

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          // Design says rgba(20,32,26,0.07); the `border` token is 0.08 — within
          // a hair, and unlike a literal it inverts correctly for a dark bar.
          borderTopColor: colors.border,
          // iOS gets a real blur behind it. Everywhere else the bar is FULLY
          // OPAQUE — see the note above `styles.bar`.
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.background,
        },
      ]}
    >
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={70}
          tint={colors.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        // primaryTint, not primary: this colour is drawn straight onto the bar
        // background, and plain Moss measures 1.98:1 there in dark mode.
        const color = isActive ? colors.primaryTint : colors.segmentInactive;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect?.(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={styles.item}
          >
            {tab.icon({ color, strokeWidth: isActive ? 1.9 : 1.75 })}
            <Text
              style={[
                styles.label,
                {
                  color,
                  fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// The design specifies rgba(249,248,244,0.94) + backdrop-filter: blur(14px).
// The alpha only reads as "frosted glass" BECAUSE of the blur — the blur is
// what destroys the legibility of whatever is behind it. React Native has no
// backdrop-filter, and expo-blur only renders a true backdrop blur on iOS;
// on Android it falls back to a flat scrim. So the design's value shipped on
// Android as 94% opacity with NO blur, which is not "frosted" — it is a
// 6%-transparent window. Listing prices and star ratings were legible THROUGH
// the bar as they scrolled under it.
//
// expo-blur does offer `experimentalBlurMethod="dimezisBlurView"` for real
// Android blur, but it is explicitly experimental, costs a full-screen
// re-render per frame, and is unreliable under the New Architecture that this
// app runs on — it would trade a legibility bug for a jank bug we cannot
// verify in Expo Go. So Android/web get a FULLY OPAQUE bar.
//
// Deliberate divergence from the design file, and the right one: a
// semi-transparent bar with no blur behind it is worse than an opaque one.
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    // 44pt minimum tap target — the Connect buttons were clipped once for
    // exactly this reason.
    minHeight: 44,
  },
  label: { fontSize: 10, letterSpacing: 0.4 }, // 0.04em at 10px
});
