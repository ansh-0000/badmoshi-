import React from 'react';
import { Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Exact values pulled from SteadyNest.dc.html's repeated tab bar block
// (identical markup in every frame): height 92, background
// rgba(249,248,244,0.94) with 14px blur, border-top 1px
// rgba(20,32,26,0.07), flush full-width (no side margins, no radius, no
// shadow) — a departure from the previous floating rounded pill. Active
// icon/label color #3A5245 (Moss) at font-weight 600; inactive
// rgba(20,32,26,0.4) at font-weight 500. Label: 10px, letter-spacing 0.04em.
const TAB_BAR_HEIGHT = 92;
const TAB_INACTIVE_COLOR = 'rgba(20, 32, 26, 0.4)';
const TAB_BORDER_COLOR = 'rgba(20, 32, 26, 0.07)';
const TAB_BG_COLOR = 'rgba(249, 248, 244, 0.94)';

function TabLabel({ focused, color, children }: { focused: boolean; color: string; children: string }) {
  return (
    <Text
      style={{
        fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_500Medium',
        fontSize: 10,
        letterSpacing: 0.4, // ~0.04em at 10px
        color,
        marginTop: 5,
      }}
    >
      {children}
    </Text>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          backgroundColor: isIOS ? 'transparent' : TAB_BG_COLOR,
          borderTopWidth: 1,
          borderTopColor: TAB_BORDER_COLOR,
          borderRadius: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 14,
          paddingBottom: insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: TAB_BG_COLOR }]} />
          ) : null,
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Stays',
          tabBarLabel: (props) => <TabLabel {...props}>Stays</TabLabel>,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="mappin.circle.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="map-pin" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: 'Connect',
          tabBarLabel: (props) => <TabLabel {...props}>Connect</TabLabel>,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tira"
        options={{
          title: 'Tira AI',
          tabBarLabel: (props) => <TabLabel {...props}>Tira AI</TabLabel>,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={22} />
            ) : (
              <MaterialCommunityIcons name="creation" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: (props) => <TabLabel {...props}>Chat</TabLabel>,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bubble.left.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Profile',
          tabBarLabel: (props) => <TabLabel {...props}>Profile</TabLabel>,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      {/* Hide the old brief screen from tabs */}
      <Tabs.Screen name="brief" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
