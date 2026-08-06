import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, Polygon } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

export type CompassState = 'idle' | 'pointing' | 'confirming';

interface Props {
  size?: number;
  state?: CompassState;
  targetAngle?: number;
}

export default function CompassDial({ size = 220, state = 'idle', targetAngle = 0 }: Props) {
  const colors = useColors();
  const rotation = useSharedValue(0);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const bezelR = size / 2 - 18;

  useEffect(() => {
    if (state === 'idle') {
      rotation.value = withRepeat(
        withSequence(
          withTiming(22, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(-16, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
          withTiming(9, { duration: 2900, easing: Easing.inOut(Easing.sin) }),
          withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false
      );
    } else if (state === 'pointing') {
      rotation.value = withTiming(targetAngle, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      rotation.value = withRepeat(
        withTiming(360, { duration: 700, easing: Easing.linear }),
        3,
        false
      );
    }
  }, [state, targetAngle]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Tick marks around bezel
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 360) / 72;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 9 === 0;
    const tickLen = isMajor ? 10 : 5;
    const x1 = cx + outerR * Math.sin(rad);
    const y1 = cy - outerR * Math.cos(rad);
    const x2 = cx + (outerR - tickLen) * Math.sin(rad);
    const y2 = cy - (outerR - tickLen) * Math.cos(rad);
    return { x1, y1, x2, y2, isMajor };
  });

  const needleH = size * 0.62;

  // Theme-adaptive colours
  const bezelFill = colors.card;
  const bezelStroke = colors.primary;
  const innerFill = colors.background;
  const tickMajor = colors.primary;
  const tickMinor = colors.border;
  const northColor = colors.primary;
  const southColor = colors.mutedForeground;
  const needleNorth = colors.primary;
  const needleSouth = colors.muted;

  return (
    <View style={{ width: size, height: size }}>
      {/* Static compass backdrop */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer glow ring */}
        <Circle cx={cx} cy={cy} r={outerR + 1} fill="none" stroke={colors.primary + '25'} strokeWidth={5} />
        {/* Main bezel */}
        <Circle cx={cx} cy={cy} r={outerR} fill={bezelFill} stroke={bezelStroke} strokeWidth={1.5} />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isMajor ? tickMajor : tickMinor}
            strokeWidth={t.isMajor ? 1.5 : 0.7}
          />
        ))}

        {/* Inner glass circle */}
        <Circle cx={cx} cy={cy} r={bezelR} fill={innerFill} stroke={colors.border} strokeWidth={0.8} />
        <Circle cx={cx} cy={cy} r={bezelR - 6} fill={colors.muted} stroke={colors.border} strokeWidth={0.4} />

        {/* Degree ring */}
        <Circle cx={cx} cy={cy} r={bezelR * 0.6} fill="none" stroke={colors.primary + '20'} strokeWidth={0.5} strokeDasharray="3,4" />

        {/* Cardinal directions */}
        <SvgText x={cx} y={cy - bezelR + 16} textAnchor="middle" fill={northColor} fontSize={12} fontWeight="bold">N</SvgText>
        <SvgText x={cx} y={cy + bezelR - 6}  textAnchor="middle" fill={southColor} fontSize={10}>S</SvgText>
        <SvgText x={cx + bezelR - 6} y={cy + 4} textAnchor="middle" fill={southColor} fontSize={10}>E</SvgText>
        <SvgText x={cx - bezelR + 6} y={cy + 4} textAnchor="middle" fill={southColor} fontSize={10}>W</SvgText>

        {/* Center cap base */}
        <Circle cx={cx} cy={cy} r={9} fill={bezelFill} stroke={colors.primary} strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={4} fill={colors.primary} />
      </Svg>

      {/* Animated rotating needle */}
      <Animated.View
        style={[
          needleStyle,
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <Svg width={18} height={needleH} viewBox={`0 0 18 ${needleH}`}>
          <Polygon
            points={`9,3 13,${needleH / 2} 5,${needleH / 2}`}
            fill={needleNorth}
            opacity={0.95}
          />
          <Polygon
            points={`9,${needleH - 3} 13,${needleH / 2} 5,${needleH / 2}`}
            fill={needleSouth}
          />
        </Svg>
      </Animated.View>

      {/* Center cap overlay */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={[styles.centerCap, { backgroundColor: colors.card, borderColor: colors.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerCap: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});
