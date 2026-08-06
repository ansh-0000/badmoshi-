import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BUILD_INFO } from '@/constants/buildInfo';

// ── Dev-only "which checkout am I running?" badge ─────────────────────────────
// Colours are deliberately hardcoded rather than pulled from constants/colors.ts.
// This badge has to stay legible when the theme is the thing that is broken, so
// it must not depend on the tokens it might be helping to debug - same reasoning
// as FALLBACK_COLORS in ErrorFallback.
const BADGE = {
  ok: 'rgba(11, 79, 82, 0.92)',
  warn: 'rgba(140, 62, 18, 0.94)',
  text: '#F9F8F4',
  textMuted: 'rgba(249, 248, 244, 0.72)',
};

// Placement and hit-area history, because this has been wrong twice:
//
//   v1  centred, full-width wrapper, tappable to expand. The Pressable spanned
//       most of the screen and swallowed the logout button on the landlord
//       dashboard.
//   v2  pointerEvents="none" everywhere, still centred at the top. Stopped
//       eating taps but now covered the first element of whatever screen it sat
//       on - it hid the top item of the component gallery.
//   v3  this one. Pinned to the top-RIGHT and sized to its content, so it sits
//       in the corner rather than over a centred header, and it is dismissible.
//       The wrapper is box-none and only the small badge itself is a target, so
//       nothing outside those ~150pt is intercepted.
export function DevTreeBadge() {
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);

  if (!__DEV__ || dismissed) return null;

  const { tree, branch, commit, uiFixesPresent, uiFixesTotal } = BUILD_INFO;

  // Amber whenever a fix this bundle is supposed to contain is absent - that is
  // the state where judging the UI on device would draw the wrong conclusion.
  const allFixesPresent = uiFixesPresent === uiFixesTotal;

  // The tree segment alone is enough to tell two checkouts apart; the full path
  // is in the console line lib/api.ts logs at startup.
  const shortTree = tree.split('/')[0];

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 4 }]}>
      <Pressable
        onPress={() => setDismissed(true)}
        accessibilityRole="button"
        accessibilityLabel="Dismiss build badge"
        style={[styles.badge, { backgroundColor: allFixesPresent ? BADGE.ok : BADGE.warn }]}
      >
        <Text style={styles.line} numberOfLines={1}>
          {shortTree} · fixes {uiFixesPresent}/{uiFixesTotal} ✕
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {branch}#{commit} · {Platform.OS}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 8,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  badge: {
    maxWidth: 190,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  line: {
    color: BADGE.text,
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'right',
  },
  sub: {
    color: BADGE.textMuted,
    fontSize: 8.5,
    textAlign: 'right',
  },
});
