import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeInUp, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { Stay } from '@/constants/data';
import { router, Link } from 'expo-router';

interface Props {
  stay: Stay;
  onPress?: () => void;
}

export default function StayCard({ stay, onPress }: Props) {
  const colors = useColors();

  const typeLabel = stay.type === 'coliving' ? 'CO-LIVING' : stay.type === 'private' ? 'PRIVATE ROOM' : 'HOSTEL';
  const typeColor = stay.type === 'coliving' ? colors.accent : stay.type === 'private' ? colors.primary : '#F8FAFC';

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Link href={`/listing/${stay.id}`} asChild>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => { scale.value = withSpring(0.96); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
      >
        <Animated.View 
          entering={FadeInUp.duration(400).springify()}
          layout={Layout.springify()}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, animatedStyle]}
        >
          
          {/* Massive Edge-to-Edge Image */}
          <Image
            source={{ uri: stay.image }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={styles.imageTopGradient}
          />

          {/* Top Badges */}
          <View style={styles.topBadges}>
            <View style={[styles.typePill, { backgroundColor: 'rgba(253, 251, 247, 0.85)', borderColor: colors.border }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            {stay.autopay && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Feather name="zap" size={10} color="#FFF" />
                <Text style={styles.badgeText}>AUTOPAY</Text>
              </View>
            )}
          </View>

          {/* Bottom Glassmorphic Content Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
            style={styles.contentOverlay}
          >
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={[styles.name, { color: '#FFF' }]} numberOfLines={1}>{stay.name}</Text>
                <View style={[styles.ratingRow, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                  <Feather name="star" size={12} color={colors.accent} />
                  <Text style={[styles.rating, { color: '#FFF' }]}>{stay.rating}</Text>
                </View>
              </View>

              <View style={styles.locationRow}>
                <Feather name="map-pin" size={12} color={'rgba(255,255,255,0.7)'} />
                <Text style={[styles.location, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                  {stay.location}
                </Text>
                {stay.verified && (
                  <View style={[styles.verifiedDot, { backgroundColor: colors.signalGreen }]}>
                    <Feather name="check" size={8} color="#fff" />
                  </View>
                )}
              </View>

              {/* Price and Remote Work Score */}
              <View style={[styles.footer, { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
                <View style={styles.workScore}>
                  <MaterialCommunityIcons name="wifi" size={14} color={colors.accent} />
                  <Text style={[styles.workValue, { color: 'rgba(255,255,255,0.9)' }]}>{stay.remoteWorkScore}/10 Remote</Text>
                </View>
                <Text style={[styles.price, { color: '#FFF' }]}>
                  ₹{stay.price.toLocaleString('en-IN')}
                  <Text style={[styles.priceSub, { color: 'rgba(255,255,255,0.7)' }]}>/mo</Text>
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    borderWidth: 0,
    marginBottom: 24,
    overflow: 'hidden',
    height: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  imageTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  topBadges: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    color: '#FFF',
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
  },
  content: {
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    marginRight: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rating: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  workScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  price: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
  },
  priceSub: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
