import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';

const { width } = Dimensions.get('window');

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=800&auto=format&fit=crop';

interface DiscoverProfile {
  id: string;
  name: string;
  role: 'tenant' | 'landlord' | null;
  city: string | null;
  avatar_url: string | null;
}

export default function MatchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const { data: profiles = [], isLoading } = useQuery<DiscoverProfile[]>({
    queryKey: ['discover'],
    queryFn: async () => {
      const { data } = await api.get('/match/discover');
      return data.profiles ?? [];
    },
    enabled: !!user,
  });

  const currentProfile = profiles[currentIndex];

  const resetCard = () => {
    translateX.value = 0;
    translateY.value = 0;
    rotate.value = 0;
    opacity.value = 1;
  };

  const advance = () => {
    setCurrentIndex((prev) => prev + 1);
    resetCard();
  };

  // Record the swipe against the real backend, then animate to the next card.
  // A right-swipe that completes a mutual like opens the real chat thread.
  const swipeCard = (direction: 'left' | 'right') => {
    if (!currentProfile || swiping) return;
    setSwiping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const target = currentProfile;
    const action = direction === 'right' ? 'like' : 'pass';

    const multiplier = direction === 'right' ? 1 : -1;
    translateX.value = withTiming(width * 1.5 * multiplier, { duration: 400 });
    rotate.value = withTiming(20 * multiplier, { duration: 400 });
    opacity.value = withTiming(0, { duration: 400 }, () => {
      runOnJS(advance)();
    });

    (async () => {
      try {
        const { data } = await api.post('/match/swipe', { targetId: target.id, action });
        if (data.match && data.chatId) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("It's a match! 🎉", `You and ${target.name} matched. Say hi!`, [
            { text: 'Later' },
            { text: 'Open chat', onPress: () => router.push(`/chat/${data.chatId}` as any) },
          ]);
        }
      } catch (err: any) {
        console.warn('Swipe failed', err?.message);
      } finally {
        setSwiping(false);
      }
    })();
  };

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Background */}
      <LinearGradient
        colors={[colors.accent + '20', colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />

      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>CONNECT</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Find co-living matches in your area</Text>
      </View>

      <View style={styles.cardContainer}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : currentProfile ? (
          <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

              <Image
                source={{ uri: currentProfile.avatar_url || FALLBACK_AVATAR }}
                style={styles.cardImage}
                contentFit="cover"
              />

              {/* Role badge */}
              <View style={[styles.matchBadge, { backgroundColor: colors.accent }]}>
                <Feather name={currentProfile.role === 'landlord' ? 'home' : 'user'} size={12} color="#FFF" />
                <Text style={styles.matchBadgeText}>
                  {currentProfile.role === 'landlord' ? 'Landlord' : 'Tenant'}
                </Text>
              </View>

              <LinearGradient
                colors={['transparent', 'rgba(253, 251, 247, 0.9)', 'rgba(253, 251, 247, 1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{currentProfile.name}</Text>
                  <Text style={[styles.role, { color: colors.primary }]}>
                    {currentProfile.city || 'India'}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No more profiles nearby.</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { marginBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }]}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.passButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => swipeCard('left')}
        >
          <Feather name="x" size={32} color={colors.destructive} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.connectButton]}
          onPress={() => swipeCard('right')}
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.connectGradient}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={32} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  cardWrapper: {
    width: '100%',
    height: '100%',
    maxHeight: 550,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  matchBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
  },
  cardContent: {
    padding: 24,
    gap: 8,
  },
  name: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
  },
  role: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 20,
    zIndex: 10,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  passButton: {
    borderWidth: 1,
  },
  connectButton: {
    overflow: 'hidden',
  },
  connectGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
});
