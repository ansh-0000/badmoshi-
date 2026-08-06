import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { SNEmpty } from '@/components/SNEmpty';
import { SNSkeleton } from '@/components/SNSkeleton';
import { SNTabBar, type TabKey } from '@/components/SNTabBar';
import { useColors } from '@/hooks/useColors';

// Dev gallery for the SN design-system components. Same purpose and precedent
// as theme-showcase.tsx: these are shared chrome, so there needs to be one place
// that renders every variant of each without hunting for a screen that happens
// to be in the right state.
//
// SNStatusBar is deliberately absent. On a real device the OS draws the status
// bar; ours would render underneath it or double it up. It is a design-frame
// artifact, and its spec lives in docs/design/SNStatusBar.dc.html.

const PIN_ICON = 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function SNShowcase() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const [tenantTab, setTenantTab] = useState<TabKey>('tira');
  const [landlordTab, setLandlordTab] = useState<TabKey>('portfolio');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
        {/* Surfaces whether the OS reduced-motion flag is actually reaching the
            app, so a "the shimmer looks static" report can be attributed to the
            setting or to a bug, not guessed at. */}
        <View style={[styles.banner, { borderColor: colors.border }]}>
          <Text style={[styles.bannerText, { color: colors.foreground }]}>
            OS reduced motion: {reducedMotion ? 'ON — slow calm fade' : 'OFF — staggered shimmer'}
          </Text>
        </View>

        {/* Skeletons first, deliberately. They are the only components here
            whose verification needs several timed screenshots, and the tab-bar
            demos sit directly in the path of a scroll gesture - swiping past
            them selects a tab and bounces the list back to the top. Putting the
            hardest thing to capture where no scrolling is required makes this
            repeatable. */}
        {(['list', 'dashboard', 'detail', 'form'] as const).map((kind) => (
          <Section key={kind} title={`SNSkeleton — kind=${kind}`}>
            <View style={[styles.demo, { height: kind === 'list' ? 640 : 560 }]}>
              <SNSkeleton kind={kind} />
            </View>
          </Section>
        ))}

        <Section title="SNTabBar — role=tenant (Tira centre, per decision b)">
          <SNTabBar role="tenant" active={tenantTab} onSelect={setTenantTab} />
        </Section>

        <Section title="SNTabBar — role=landlord (same component, swapped config)">
          <SNTabBar role="landlord" active={landlordTab} onSelect={setLandlordTab} />
        </Section>

        <Section title="SNEmpty — 1. title only">
          <View style={[styles.demo, { height: 260 }]}>
            <SNEmpty title="Nothing here yet" />
          </View>
        </Section>

        <Section title="SNEmpty — 2. title + body">
          <View style={[styles.demo, { height: 300 }]}>
            <SNEmpty
              title="No saved stays"
              body="Homes you save will appear here so you can compare them side by side."
            />
          </View>
        </Section>

        <Section title="SNEmpty — 3. title + body + one CTA">
          <View style={[styles.demo, { height: 360 }]}>
            <SNEmpty
              title="No stays nearby"
              body="Nothing within 2 km of Saket right now. Try widening your radius."
              cta="Widen to 5 km"
              iconPath={PIN_ICON}
            />
          </View>
        </Section>

        <Section title="SNEmpty — 4. title + body + two CTAs">
          <View style={[styles.demo, { height: 420 }]}>
            <SNEmpty
              title="No stays nearby"
              body="Nothing within 2 km of Saket right now."
              cta="Widen to 5 km"
              cta2="Change my areas"
              iconPath={PIN_ICON}
            />
          </View>
        </Section>

        <Section title="SNEmpty — 5. everything, including the mono meta line">
          <View style={[styles.demo, { height: 470 }]}>
            <SNEmpty
              title="No stays nearby"
              body="Nothing within 2 km of Saket right now."
              cta="Widen to 5 km"
              cta2="Change my areas"
              meta="SAKET · 2 KM RADIUS · 0 RESULTS"
              iconPath={PIN_ICON}
            />
          </View>
        </Section>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 52, paddingBottom: 60, gap: 26 },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10.5,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
  },
  demo: { borderRadius: 12, overflow: 'hidden', marginHorizontal: 8 },
  banner: {
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
