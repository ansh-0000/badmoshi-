import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { SNTabBar, type TabKey } from '@/components/SNTabBar';

const ROUTE_TO_TAB: Record<string, TabKey> = {
  dashboard: 'portfolio',
  listings: 'properties',
  payments: 'payments',
  tira: 'tira',
  profile: 'profile',
};

const TAB_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route]),
) as Record<TabKey, string>;

function LandlordTabBar({ state, navigation }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index]?.name;

  const onSelect = useCallback((key: TabKey) => {
    const target = state.routes.find((route) => route.name === TAB_TO_ROUTE[key]);
    if (!target) return;

    const isFocused = state.routes[state.index]?.key === target.key;
    const event = navigation.emit({
      type: 'tabPress',
      target: target.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(target.name);
  }, [navigation, state.index, state.routes]);

  return (
    <View style={styles.barWrap}>
      <SNTabBar
        role="landlord"
        active={ROUTE_TO_TAB[activeRoute] ?? 'portfolio'}
        onSelect={onSelect}
      />
    </View>
  );
}

export default function LandlordLayout() {
  return (
    <Tabs tabBar={(props) => <LandlordTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="listings" options={{ title: 'Properties' }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments' }} />
      <Tabs.Screen name="tira" options={{ title: 'Tira AI' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="inquiries" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
