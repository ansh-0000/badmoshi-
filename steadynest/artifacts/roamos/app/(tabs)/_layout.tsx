import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { SNTabBar, type TabKey } from '@/components/SNTabBar';

// NOTE: on iOS versions where Liquid Glass is available, this OS-rendered
// native tab bar is used instead of ClassicTabLayout below. Its background,
// shape, and blur are system chrome — not something app code can restyle to
// match the design's flush, square, alabaster-blur bar. Only icon choice is
// controllable here, so that's the only thing updated to match the design's
// iconography; the rest is a real, unavoidable platform divergence.
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'mappin', selected: 'mappin.circle.fill' }} />
        <Label>Stays</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="match">
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <Label>Connect</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tira">
        <Icon sf={{ default: 'sparkles', selected: 'sparkles' }} />
        <Label>Tira AI</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <Label>Chat</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ── One tab bar, not two ─────────────────────────────────────────────────────
// This screen used to re-declare the bar's height, background, border, active
// colour, icon set and label metrics inline — a second implementation of
// components/SNTabBar.tsx. They had already drifted: SNTabBar was moved to
// `primaryTint` after the active tab measured 1.98:1 in dark mode, and this
// copy kept `colors.primary` and stayed broken. Its three colours were also
// hardcoded light-mode literals, so the real app's bar never darkened at all.
//
// The navigator now renders SNTabBar directly, so there is exactly one
// definition of what the bar looks like.
const ROUTE_TO_TAB: Record<string, TabKey> = {
  index: 'stays',
  match: 'connect',
  tira: 'tira',
  chat: 'chat',
  me: 'profile',
};
const TAB_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route])
) as Record<TabKey, string>;

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index]?.name;

  const onSelect = useCallback(
    (key: TabKey) => {
      const target = state.routes.find((r) => r.name === TAB_TO_ROUTE[key]);
      if (!target) return;

      const isFocused = state.routes[state.index]?.key === target.key;
      const event = navigation.emit({
        type: 'tabPress',
        target: target.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(target.name);
      }
    },
    [state.routes, state.index, navigation]
  );

  // Absolutely positioned so screen content still runs full-bleed underneath
  // it — that is the contract `useTabBarClearance()` in constants/layout.ts is
  // written against. Every tab screen reserves TAB_BAR_HEIGHT + inset at the
  // bottom; putting the bar back into normal flow would double that padding.
  return (
    <View style={styles.barWrap}>
      <SNTabBar
        role="tenant"
        active={ROUTE_TO_TAB[activeRoute] ?? 'stays'}
        onSelect={onSelect}
      />
    </View>
  );
}

function ClassicTabLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Stays' }} />
      <Tabs.Screen name="match" options={{ title: 'Connect' }} />
      <Tabs.Screen name="tira" options={{ title: 'Tira AI' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="me" options={{ title: 'Profile' }} />
      {/* Hide the old brief screen from tabs */}
      <Tabs.Screen name="brief" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
