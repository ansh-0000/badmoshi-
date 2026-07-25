import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Translation } from '@/constants/data';

interface Props {
  translation: Translation;
  targetLang: 'hindi' | 'tamil';
}

export default function FlipCard({ translation, targetLang }: Props) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const flipped = useSharedValue(false);

  const frontStyle = useAnimatedStyle(() => {
    const rotate = progress.value * 180;
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotate}deg` },
      ],
      opacity: progress.value < 0.5 ? 1 : 0,
      position: 'absolute',
      width: '100%',
      height: '100%',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotate = (progress.value - 1) * 180;
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotate}deg` },
      ],
      opacity: progress.value >= 0.5 ? 1 : 0,
      position: 'absolute',
      width: '100%',
      height: '100%',
    };
  });

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isFlipped = flipped.value;
    flipped.value = !isFlipped;
    progress.value = withTiming(isFlipped ? 0 : 1, {
      duration: 380,
      easing: Easing.inOut(Easing.quad),
    });
  };

  const targetText = translation[targetLang];

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: colors.border }]}
      onPress={handleFlip}
      activeOpacity={1}
    >
      {/* Front (English) */}
      <Animated.View style={[frontStyle, styles.face, { backgroundColor: colors.card }]}>
        <Text style={[styles.langTag, { color: colors.mutedForeground }]}>ENGLISH</Text>
        <Text style={[styles.phrase, { color: colors.foreground }]}>{translation.english}</Text>
        <View style={[styles.flipHint, { borderColor: colors.border }]}>
          <Text style={[styles.flipHintText, { color: colors.mutedForeground }]}>tap to translate</Text>
        </View>
      </Animated.View>

      {/* Back (target language) */}
      <Animated.View style={[backStyle, styles.face, { backgroundColor: colors.muted }]}>
        <Text style={[styles.langTag, { color: colors.primary }]}>
          {targetLang === 'hindi' ? 'HINDI' : 'TAMIL'}
        </Text>
        <Text style={[styles.phrase, { color: colors.foreground }]}>{targetText}</Text>
        <Text style={[styles.transliteration, { color: colors.mutedForeground }]}>
          {translation.transliteration}
        </Text>
        <View style={[styles.flipHint, { borderColor: colors.border }]}>
          <Text style={[styles.flipHintText, { color: colors.mutedForeground }]}>tap to flip back</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  face: {
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    gap: 8,
    backfaceVisibility: 'hidden',
  },
  langTag: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  phrase: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 26,
  },
  transliteration: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  flipHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  flipHintText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});
