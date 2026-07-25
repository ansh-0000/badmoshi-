import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { FoodPlace } from '@/constants/data';

interface Props {
  place: FoodPlace;
  onPress?: () => void;
}

const PRICE_LABELS = ['', '₹', '₹₹', '₹₹₹'];
const TYPE_ICONS: Record<string, any> = { cafe: 'coffee', restaurant: 'book-open', bar: 'moon' };

export default function FoodCard({ place, onPress }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={0.88}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: place.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <View style={[styles.typeTag, { backgroundColor: 'rgba(11,14,19,0.82)' }]}>
          <Feather name={TYPE_ICONS[place.type]} size={11} color={colors.primary} />
          <Text style={[styles.typeText, { color: colors.primary }]}>{place.type.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{place.name}</Text>
        <Text style={[styles.cuisine, { color: colors.mutedForeground }]} numberOfLines={1}>{place.cuisine}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Feather name="star" size={11} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.foreground }]}>{place.rating}</Text>
          </View>
          <Text style={[styles.price, { color: colors.mutedForeground }]}>{PRICE_LABELS[place.priceLevel]}</Text>
          <View style={[styles.openDot, {
            backgroundColor: place.openAt === 'day' ? colors.primary
              : place.openAt === 'night' ? colors.accent
              : colors.jade,
          }]} />
        </View>

        <Text style={[styles.location, { color: colors.mutedForeground }]} numberOfLines={1}>
          <Feather name="map-pin" size={10} /> {place.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    width: 180,
    marginRight: 12,
  },
  imageWrap: {
    height: 130,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  body: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  cuisine: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  price: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  location: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
});
