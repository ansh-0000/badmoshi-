import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';

// ── SNSkeleton ────────────────────────────────────────────────────────────────
// Loading placeholders for the four page shapes in the design system
// (SNSkeleton.dc.html): list, dashboard, detail, form.
//
// Motion, and why reduced-motion is not "no motion":
//
// The design's shimmer is opacity 0.45 → 1 → 0.45 over 1.5s, staggered per
// block. Under an OS reduced-motion setting the obvious move is to freeze it,
// but a static tinted block is indistinguishable from a screen that has hung —
// which is the same failure as a non-spinning ActivityIndicator, and the reason
// the Stays skeleton was made static in the first place.
//
// So reduced motion changes the *character* of the animation rather than
// removing it: a single slow symmetric fade (2.4s, no stagger, shallower
// 0.55 → 0.85 range). Nothing translates, nothing pulses fast, but the screen
// is still visibly alive. Users who set the OS flag are asking not to be made
// dizzy, not to be shown a frozen page.
const SHIMMER_MS = 1500;
const SHIMMER_MIN = 0.45;
const SHIMMER_MAX = 1;

const CALM_MS = 2400;
const CALM_MIN = 0.55;
const CALM_MAX = 0.85;

/** One shimmering block. `delay` is ignored under reduced motion (no stagger). */
function Shimmer({ style, delay = 0 }: { style?: ViewStyle | ViewStyle[]; delay?: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? CALM_MIN : SHIMMER_MIN);

  React.useEffect(() => {
    const to = reduced ? CALM_MAX : SHIMMER_MAX;
    const duration = reduced ? CALM_MS : SHIMMER_MS / 2;
    const loop = withRepeat(
      withTiming(to, {
        duration,
        easing: Easing.inOut(Easing.ease),
        // ReduceMotion.Never is required, not a preference. Reanimated's
        // default policy is to disable an animation outright when the OS
        // reduced-motion flag is set - so the calm fade above never ran, and
        // the skeleton rendered as completely static blocks. Verified by
        // capturing four frames a second apart: byte-identical.
        //
        // Opting out is correct here specifically because this component has
        // ALREADY adapted: under the flag it runs one slow symmetric fade with
        // no stagger and a shallow opacity range. Reanimated's blanket disable
        // assumes an animation that has not been adapted, and applying it on
        // top produces the exact failure the adaptation exists to prevent - a
        // frozen page that is indistinguishable from a hung one.
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true, // reverse — gives the 0→50→100 symmetry of the CSS keyframe
    );
    progress.value = reduced ? loop : withDelay(delay, loop);
    return () => cancelAnimation(progress);
  }, [reduced, delay, progress]);

  const animated = useAnimatedStyle(() => ({ opacity: progress.value }));

  return <Animated.View style={[style, animated]} />;
}

/** Shared tint ramp. Dark mode needs roughly double — see the note below. */
function useSkeletonTints() {
  const colors = useColors();
  // The design's alphas (0.07/0.09/0.10) are tuned for a dark lift on a light
  // surface. The same alpha as a white lift on the dark palette is far weaker
  // perceptually - on the emulator the blocks were barely separable from the
  // background, which defeats the point of a skeleton.
  const a = colors.isDark
    ? { faint: '1F', soft: '2B', mid: '33' } // 0.12 / 0.17 / 0.20
    : { faint: '12', soft: '17', mid: '1A' }; // 0.07 / 0.09 / 0.10
  return {
    colors,
    tintFaint: { backgroundColor: colors.foreground + a.faint },
    tintSoft: { backgroundColor: colors.foreground + a.soft },
    tintMid: { backgroundColor: colors.foreground + a.mid },
    // primaryTint, not primary — these blocks sit directly on the page
    // background, where Moss is near-invisible on the dark palette.
    accentFaint: { backgroundColor: colors.primaryTint + '1A' },
    accentSoft: { backgroundColor: colors.primaryTint + '29' },
    card: {
      backgroundColor: colors.card,
      shadowColor: colors.foreground,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 17,
      elevation: 2,
    },
  };
}

/**
 * One list-card placeholder — thumbnail, two text lines, and a price/rating
 * footer row.
 *
 * Exported separately because the Stays screen needs the cards without
 * SNSkeleton's header and filter chips: it already renders its own
 * ListHeaderComponent (map, radius slider, segmented control), so the full
 * `list` variant would draw a second header underneath the real one. Sharing
 * the row rather than copying it is what stops the two drifting - the previous
 * hand-rolled StayRowSkeleton had already diverged on line count, heights and
 * card shadow.
 */
export function SNSkeletonListRow() {
  const { tintFaint, tintSoft, accentSoft, card } = useSkeletonTints();
  return (
    <View style={[styles.listCard, card]}>
      <Shimmer style={[styles.thumb, tintFaint]} />
      <View style={styles.listBody}>
        <Shimmer style={[styles.pill, { width: '74%', height: 14 }, tintSoft]} delay={100} />
        <Shimmer style={[styles.pill, { width: '52%', height: 10 }, tintFaint]} delay={200} />
        <View style={{ flex: 1 }} />
        <View style={styles.listFooter}>
          <Shimmer style={[styles.pill, { width: 88, height: 17 }, accentSoft]} delay={250} />
          <Shimmer style={[styles.pill, { width: 38, height: 12 }, tintFaint]} delay={300} />
        </View>
      </View>
    </View>
  );
}

export type SNSkeletonProps = { kind?: 'list' | 'dashboard' | 'detail' | 'form' };

export function SNSkeleton({ kind = 'list' }: SNSkeletonProps) {
  const colors = useColors();

  // The design's alphas (0.07/0.09/0.10) are tuned for a dark lift on a light
  // surface. The same alpha as a white lift on the dark palette is far weaker
  // perceptually - on the emulator the blocks were barely separable from the
  const { tintFaint, tintSoft, tintMid, accentFaint, accentSoft, card } = useSkeletonTints();

  return (
    <View style={styles.wrap} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {/* Shared header — present in every variant */}
      <View style={styles.header}>
        <Shimmer style={[styles.pill, { width: 96, height: 10 }, tintSoft]} />
        <Shimmer style={[{ width: 172, height: 24, borderRadius: 8 }, tintMid]} delay={100} />
      </View>

      {kind === 'list' && (
        <>
          <View style={styles.chipRow}>
            <Shimmer style={[styles.chip, { width: 56 }, accentFaint]} />
            <Shimmer style={[styles.chip, { width: 82 }, tintFaint]} delay={150} />
            <Shimmer style={[styles.chip, { width: 70 }, tintFaint]} delay={300} />
          </View>
          {[0, 1, 2, 3].map((i) => (
            <SNSkeletonListRow key={i} />
          ))}
        </>
      )}

      {kind === 'dashboard' && (
        <>
          <Shimmer style={[styles.hero, accentFaint]} />
          <View style={styles.grid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.gridCell, card]}>
                <Shimmer style={[styles.pill, { width: '56%', height: 9 }, tintFaint]} />
                <Shimmer style={[{ width: '72%', height: 20, borderRadius: 6 }, tintMid]} delay={150} />
              </View>
            ))}
          </View>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.row, card]}>
              <Shimmer style={[styles.avatar, tintFaint]} />
              <Shimmer style={[styles.pill, { flex: 1, height: 12 }, tintFaint]} delay={100} />
              <Shimmer style={[styles.pill, { width: 62, height: 15 }, tintSoft]} delay={200} />
            </View>
          ))}
        </>
      )}

      {kind === 'detail' && (
        <>
          <Shimmer style={[{ height: 212, borderRadius: 28 }, tintFaint]} />
          <View style={{ gap: 11 }}>
            <Shimmer style={[{ width: '66%', height: 24, borderRadius: 8 }, tintMid]} delay={100} />
            <Shimmer style={[styles.pill, { width: '44%', height: 11 }, tintFaint]} delay={200} />
          </View>
          <View style={styles.chipRow}>
            <Shimmer style={[styles.chipSm, { width: 74 }, accentFaint]} />
            <Shimmer style={[styles.chipSm, { width: 62 }, accentFaint]} delay={120} />
            <Shimmer style={[styles.chipSm, { width: 88 }, accentFaint]} delay={240} />
          </View>
          <View style={{ gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Shimmer key={i} style={[styles.pill, { height: 11 }, tintFaint]} />
            ))}
            <Shimmer style={[styles.pill, { width: '58%', height: 11 }, tintFaint]} delay={200} />
          </View>
          <View style={[{ height: 72, borderRadius: 28 }, card]} />
        </>
      )}

      {kind === 'form' && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 10 }}>
              <Shimmer style={[styles.pill, { width: 104, height: 9 }, tintFaint]} />
              <Shimmer
                style={[
                  styles.field,
                  { backgroundColor: colors.foreground + (colors.isDark ? '1A' : '0F'), borderColor: colors.border },
                ]}
                delay={100}
              />
            </View>
          ))}
          <View style={{ flex: 1 }} />
          <Shimmer style={[{ height: 56, borderRadius: 9999 }, accentSoft]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', paddingTop: 8, paddingHorizontal: 22, paddingBottom: 24, gap: 16 },
  header: { gap: 9, paddingTop: 8, paddingHorizontal: 2 },
  pill: { borderRadius: 9999 },
  chipRow: { flexDirection: 'row', gap: 9 },
  chip: { height: 32, borderRadius: 9999 },
  chipSm: { height: 30, borderRadius: 9999 },
  listCard: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: 28 },
  thumb: { width: 96, height: 96, borderRadius: 20, flexGrow: 0, flexShrink: 0 },
  listBody: { flex: 1, gap: 10, paddingVertical: 6, minWidth: 0 },
  listFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  hero: { height: 156, borderRadius: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { height: 84, borderRadius: 24, padding: 16, gap: 10, flexBasis: '47%', flexGrow: 1 },
  row: { height: 60, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  avatar: { width: 36, height: 36, borderRadius: 9999 },
  field: { height: 54, borderRadius: 9999, borderWidth: 1 },
});
