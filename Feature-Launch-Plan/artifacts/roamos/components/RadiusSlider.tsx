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
export default function RadiusSlider({ min, max, step, value, onChange }: Props) {
  const colors = useColors();
  const trackWidth = useSharedValue(0);
  const steps = Math.round((max - min) / step);

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

  const gesture = Gesture.Pan()
    .onChange((e) => {
      const next = Math.min(Math.max(thumbX.value + e.changeX, 0), trackWidth.value - THUMB_SIZE);
      thumbX.value = next;
    })
    .onEnd(() => {
      const pct = trackWidth.value > THUMB_SIZE ? thumbX.value / (trackWidth.value - THUMB_SIZE) : 0;
      const raw = min + pct * (max - min);
      const snapped = Math.min(max, Math.max(min, Math.round(raw / step) * step));
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
    <View style={styles.wrapper} onLayout={onLayout}>
      <View style={[styles.track, { backgroundColor: 'rgba(20,32,26,0.14)' }]} />
      <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, fillStyle]} />
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: colors.primary, borderColor: colors.background },
            thumbStyle,
          ]}
          hitSlop={12}
        />
      </GestureDetector>
    </View>
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
