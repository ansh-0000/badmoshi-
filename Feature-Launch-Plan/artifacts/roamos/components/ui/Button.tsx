import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { typography } from '@/constants/typography';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  title?: string;
  haptic?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  title,
  haptic = true,
  style,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const colors = useColors();

  const handlePress = (e: any) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) {
      onPress(e);
    }
  };

  // Determine styles based on variant
  let bgColor = colors.primary;
  let textColor = colors.primaryForeground;
  let borderColor = 'transparent';

  switch (variant) {
    case 'secondary':
      bgColor = colors.secondary;
      textColor = colors.secondaryForeground;
      break;
    case 'outline':
      bgColor = 'transparent';
      textColor = colors.foreground;
      borderColor = colors.border;
      break;
    case 'ghost':
      bgColor = 'transparent';
      textColor = colors.foreground;
      break;
    case 'destructive':
      bgColor = colors.destructive;
      textColor = colors.destructiveForeground;
      break;
    case 'primary':
    default:
      bgColor = colors.primary;
      textColor = colors.primaryForeground;
      break;
  }

  // Determine styles based on size
  let paddingVertical = 12;
  let paddingHorizontal = 24;
  let fontStyle: TextStyle = typography.body;
  let borderRadius = colors.radius;

  switch (size) {
    case 'sm':
      paddingVertical = 8;
      paddingHorizontal = 16;
      fontStyle = typography.bodySm;
      borderRadius = colors.radius - 4;
      break;
    case 'lg':
      paddingVertical = 16;
      paddingHorizontal = 32;
      fontStyle = { ...typography.body, fontFamily: 'Inter_600SemiBold' };
      break;
    case 'icon':
      paddingVertical = 12;
      paddingHorizontal = 12;
      borderRadius = 9999;
      break;
    case 'md':
    default:
      paddingVertical = 12;
      paddingHorizontal = 24;
      fontStyle = { ...typography.body, fontFamily: 'Inter_500Medium' };
      break;
  }

  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    backgroundColor: bgColor,
    borderColor: borderColor,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderRadius: borderRadius,
    paddingVertical,
    paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.6 : 1,
    gap: 8,
  };

  return (
    <TouchableOpacity
      style={[containerStyle, style]}
      disabled={isDisabled}
      onPress={handlePress}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {leftIcon}
          {title && size !== 'icon' && (
            <Text style={[fontStyle, { color: textColor }]}>
              {title}
            </Text>
          )}
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}
