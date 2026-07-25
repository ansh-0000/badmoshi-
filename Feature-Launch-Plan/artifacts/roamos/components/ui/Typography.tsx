import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { typography as t } from '@/constants/typography';
import { useColors } from '@/hooks/useColors';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySm' | 'label' | 'caption' | 'mono';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Typography({ variant = 'body', color, align = 'left', style, children, ...props }: TypographyProps) {
  const colors = useColors();
  
  const textStyle = [
    t[variant],
    { color: color || colors.foreground, textAlign: align },
    style
  ];

  return <Text style={textStyle} {...props}>{children}</Text>;
}

export const H1 = (props: TypographyProps) => <Typography variant="h1" {...props} />;
export const H2 = (props: TypographyProps) => <Typography variant="h2" {...props} />;
export const H3 = (props: TypographyProps) => <Typography variant="h3" {...props} />;
export const H4 = (props: TypographyProps) => <Typography variant="h4" {...props} />;
export const P = (props: TypographyProps) => <Typography variant="body" {...props} />;
export const Label = (props: TypographyProps) => <Typography variant="label" {...props} />;
export const Caption = (props: TypographyProps) => <Typography variant="caption" {...props} />;
