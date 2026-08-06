import React from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}

const THUMB_SIZE = 22;

// Matches SteadyNest Current Build.html's <input type="range"> treatment:
// 4px track (rgba(20,32,26,0.14)), moss fill to the thumb, 22px thumb
// (moss fill, 3px alabaster border) — rebuilt natively since RN has no
// styleable range input, using the existing gesture-handler/reanimated
// stack rather than adding a new native slider dependency.
//
// The gesture used to be attached only to the 22px thumb, so a drag
// starting anywhere else on the track (the natural way to grab a slider,
// and how the native <input type="range"> in the design behaves) did
// nothing — it looked completely disconnected. The Pan gesture now covers
// the full track and resolves the touch's absolute x position each frame,
// so tapping or dragging anywhere along the track moves the thumb.
export default function RadiusSlider({ min, max, step, value, onChange }: Props) {
  const colors = useColors();
  const trackWidth = useSharedValue(0);

  const valueToX = (v: number) => {
    'worklet';
    if (trackWidth.value <= 0) return 0;
    const pct = (v - min) / (max - min);
    return pct * (trackWidth.value - THUMB_SIZE);
  };

  const thumbX = useSharedValue(0);

  React.useEffect(() => {
    thumbX.value = valueToX(value);
  }, [value, trackWidth.value]);

  const commit = (v: number) => {
    onChange(v);
    Haptics.selectionAsync();
  };

  const xToSnappedValue = (x: number) => {
    'worklet';
    const usableWidth = trackWidth.value - THUMB_SIZE;
    const pct = usableWidth > 0 ? Math.min(1, Math.max(0, (x - THUMB_SIZE / 2) / usableWidth)) : 0;
    const raw = min + pct * (max - min);
    return Math.min(max, Math.max(min, Math.round(raw / step) * step));
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      thumbX.value = Math.min(Math.max(e.x - THUMB_SIZE / 2, 0), Math.max(trackWidth.value - THUMB_SIZE, 0));
    })
    .onChange((e) => {
      thumbX.value = Math.min(Math.max(e.x - THUMB_SIZE / 2, 0), Math.max(trackWidth.value - THUMB_SIZE, 0));
    })
    .onEnd((e) => {
      const snapped = xToSnappedValue(e.x);
      thumbX.value = valueToX(snapped);
      runOnJS(commit)(snapped);
    });

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_SIZE / 2,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.wrapper} onLayout={onLayout} hitSlop={{ top: 12, bottom: 12 }}>
        <View style={[styles.track, { backgroundColor: 'rgba(20,32,26,0.14)' }]} />
        <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, fillStyle]} />
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: colors.primary, borderColor: colors.background },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 9999,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 9999,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 9999,
    borderWidth: 3,
    shadowColor: '#14201A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
});
