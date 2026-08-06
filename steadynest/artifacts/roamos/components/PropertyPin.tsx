import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Marker } from '@/components/MapView'; // Import from MapView to utilize the web mock

export interface PropertyPinProps {
  coordinate: { latitude: number; longitude: number };
  price: number;
  type: string;
  /** Light pin variant (alabaster bg, ink text) — used for the cheapest/attention pin, per design frame 01. */
  light?: boolean;
  onPress?: () => void;
}

// Matches SteadyNest Current Build.html frame 01's price pins exactly:
// plain rounded-full pill, JetBrains Mono 11px/600, no icon, no pointer
// triangle — moss-filled by default, one alabaster-filled variant.
export function PropertyPin({ coordinate, price, light, onPress }: PropertyPinProps) {
  const colors = useColors();

  const formattedPrice = price >= 1000 ? `₹${Math.round(price / 1000)}k` : `₹${price}`;

  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View
        style={[
          styles.pin,
          { backgroundColor: light ? colors.background : colors.primary },
        ]}
      >
        <Text style={[styles.priceText, { color: light ? colors.foreground : colors.primaryForeground }]}>
          {formattedPrice}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    shadowColor: '#14201A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  priceText: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 11,
  },
});
