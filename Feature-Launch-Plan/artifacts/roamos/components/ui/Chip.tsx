import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { typography } from '@/constants/typography';

export interface ChipProps {
  label: string;
  variant?: 'filled' | 'outline';
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Chip({ label, variant = 'filled', active = false, onPress, style }: ChipProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) onPress();
  };

  let bgColor = variant === 'filled' ? colors.secondary : 'transparent';
  let textColor = colors.foreground;
  let borderColor = variant === 'outline' ? colors.border : 'transparent';

  if (active) {
    bgColor = colors.primary;
    textColor = colors.primaryForeground;
    borderColor = colors.primary;
  }

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: 9999, // fully rounded pill
        },
        style,
      ]}
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Text style={[typography.bodySm, { color: textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
