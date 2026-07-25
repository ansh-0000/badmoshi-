import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export interface StayRowData {
  id: string;
  title: string;
  meta: string; // e.g. "Fully furnished · 2.3 km · Owner-listed"
  price: number;
  rating: number;
  verified: boolean;
  image?: string;
}

interface Props {
  stay: StayRowData;
  onPress?: () => void;
}

// Compact row card — matches SteadyNest Current Build.html frame 01's
// "Stays nearby" list items exactly (96x96 thumbnail, Verified pill,
// heart icon, JetBrains Mono price + gold-star rating), replacing the
// old full-bleed hero-photo StayCard for this screen only.
export default function StayRow({ stay, onPress }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <View style={styles.thumb}>
        {stay.image ? (
          <Image source={{ uri: stay.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Feather name="image" size={24} color="rgba(20,32,26,0.28)" />
        )}
        {stay.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(58,82,69,0.9)' }]}>
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {stay.title}
            </Text>
            <Feather name="heart" size={19} color="rgba(20,32,26,0.32)" />
          </View>
          <Text style={[styles.meta, { color: 'rgba(20,32,26,0.5)' }]} numberOfLines={1}>
            {stay.meta}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>
              ₹{stay.price.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.priceSub, { color: 'rgba(20,32,26,0.45)' }]}>/mo</Text>
          </View>
          <View style={styles.ratingRow}>
            <Feather name="star" size={14} color="#E2A73E" />
            <Text style={[styles.rating, { color: colors.foreground }]}>{stay.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: 28,
    marginBottom: 14,
    shadowColor: '#14201A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 3,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: 20,
    flexShrink: 0,
    backgroundColor: '#DBDAD0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
    color: '#F9F8F4',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  meta: {
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  price: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
  },
  priceSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 12,
  },
});
