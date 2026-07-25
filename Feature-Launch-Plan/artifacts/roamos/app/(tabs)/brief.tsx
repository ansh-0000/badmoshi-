import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { CITIES, CHECKLIST_ITEMS, NEARBY_PLACES } from '@/constants/data';

import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/MapView';

const MAP_HEIGHT = 450;

export default function ArrivalBriefScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentCityId, completedItems, toggleChecklistItem, resetChecklist } = useApp();

  const city = CITIES.find(c => c.id === currentCityId) ?? CITIES[0];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const [activeChecklist, setActiveChecklist] = useState<any[]>(CHECKLIST_ITEMS);
  const [newItemText, setNewItemText] = useState('');

  const completedCount = activeChecklist.filter(i => completedItems.includes(i.id)).length;
  const progress = activeChecklist.length > 0 ? completedCount / activeChecklist.length : 0;

  const [isChecklistExploded, setIsChecklistExploded] = useState(false);
  const checklistScale = useSharedValue(1);
  const checklistOpacity = useSharedValue(1);

  useEffect(() => {
    if (progress === 1 && !isChecklistExploded) {
      checklistScale.value = withSequence(
        withTiming(1.05, { duration: 150 }),
        withTiming(1.2, { duration: 100 }),
        withTiming(0, { duration: 250 })
      );
      checklistOpacity.value = withSequence(
        withTiming(1, { duration: 250 }),
        withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(setIsChecklistExploded)(true);
          }
        })
      );
    }
  }, [progress, isChecklistExploded]);

  const checklistAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checklistScale.value }],
      opacity: checklistOpacity.value,
    };
  });

  const handleResetChecklist = () => {
    if (!newItemText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newItem = {
      id: Date.now().toString(),
      title: newItemText.trim(),
      timeEst: 'Added just now',
      icon: 'check-circle'
    };
    
    setActiveChecklist([newItem]);
    resetChecklist();
    setNewItemText('');
    
    setIsChecklistExploded(false);
    checklistScale.value = 1;
    checklistOpacity.value = 1;
  };

  // Parallax map values
  const scrollY = useSharedValue(0);
  
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const mapAnimatedStyle = useAnimatedStyle(() => {
    // 0.5 parallax ratio
    const translateY = interpolate(scrollY.value, [0, MAP_HEIGHT], [0, -MAP_HEIGHT * 0.5], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, MAP_HEIGHT * 0.8], [1, 0], Extrapolation.CLAMP);
    // Over-scroll stretch effect [1, 1.15]
    const scale = interpolate(scrollY.value, [-100, 0], [1.15, 1], Extrapolation.CLAMP);
    
    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  const contentHeaderStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [-100, 0], [100, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY }] };
  });

  const [lat, lng] = city?.coords.split('  ').map(s => parseFloat(s)) || [28.6139, 77.2090];
  const origin = { lat, lng };

  const getMarkerContent = (type: string) => {
    switch(type) {
      case 'food': 
        return { color: colors.jade, icon: 'coffee' as const, label: '' }; // Cafes: Moss Moss pins
      case 'transport': 
        return { color: colors.destructive, icon: 'battery-charging' as const, label: '' }; // Petrol: Earth Rust pins
      case 'stay': 
        return { color: colors.foreground, icon: 'home' as const, label: '₹14K' }; // Hostels: Forest Ink pins with price
      default: 
        return { color: colors.background, icon: 'map-pin' as const, label: '' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.jade + '10', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      
      {/* Upfront Map */}
      <Animated.View style={[styles.mapWrapper, { height: MAP_HEIGHT }, mapAnimatedStyle]}>
        {Platform.OS !== 'web' ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: origin.lat,
              longitude: origin.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            customMapStyle={[
              { elementType: "geometry", stylers: [{ color: "#FAFAF8" }] }, // Warm Sand base
              { elementType: "labels.text.stroke", stylers: [{ color: "#FAFAF8" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#1A1D1F" }] }, // Ink
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#F0EFEB" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#0B4F52" }] }, // Deep Ocean
            ]}
          >
            {NEARBY_PLACES.map(place => {
              const pLat = origin.lat + (Math.random() - 0.5) * 0.03;
              const pLng = origin.lng + (Math.random() - 0.5) * 0.03;
              const marker = getMarkerContent(place.type);
              return (
                <Marker key={place.id} coordinate={{ latitude: pLat, longitude: pLng }}>
                  <View style={[styles.customPin, { backgroundColor: marker.color }]}>
                    {marker.label ? (
                      <Text style={[styles.pinLabel, { color: colors.background }]}>{marker.label}</Text>
                    ) : (
                      <Feather name={marker.icon} size={14} color={colors.background} />
                    )}
                  </View>
                </Marker>
              );
            })}
          </MapView>
        ) : (
          <View style={[styles.webMapFallback, { backgroundColor: colors.background }]}>
            <Feather name="map" size={48} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, marginTop: 16 }}>Map available on Native App.</Text>
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: MAP_HEIGHT - 60, paddingBottom: insets.bottom + 100 },
        ]}
      >
        <Animated.View style={[styles.contentOverlayWrapper, contentHeaderStyle]}>
          <BlurView intensity={60} tint="light" style={styles.blurWrapper}>
            <View style={[styles.contentOverlay, { backgroundColor: colors.glass }]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.cityName, { color: colors.foreground }]}>
                    {city.name.toUpperCase()}
                  </Text>
                  <Text style={[styles.coords, { color: colors.mutedForeground }]}>
                    {city.coords}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <Text style={[styles.time, { color: colors.secondary }]}>{timeStr}</Text>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>{dateStr}</Text>
                </View>
              </View>

              <Text style={[styles.wordmark, { color: colors.foreground + '10' }]}>STEADYNEST</Text>

              {/* Quick Actions — 3-button grid */}
              <View style={styles.quickRow}>
                <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.border }]} onPress={() => router.push('/(tabs)/nearby' as any)}>
                  <Feather name="compass" size={20} color={colors.primary} />
                  <Text style={[styles.quickText, { color: colors.foreground }]}>Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.border }]} onPress={() => router.push('/guide' as any)}>
                  <Feather name="message-circle" size={20} color={colors.primary} />
                  <Text style={[styles.quickText, { color: colors.foreground }]}>AI Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, { borderColor: colors.tiraViolet + '40', backgroundColor: colors.tiraViolet + '08' }]}
                  onPress={() => router.push('/tira')}
                >
                  <Text style={{ fontSize: 18 }}>✨</Text>
                  <Text style={[styles.quickText, { color: colors.tiraViolet }]}>Tira</Text>
                </TouchableOpacity>
              </View>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                  {completedCount}/{CHECKLIST_ITEMS.length} arrival tasks
                </Text>
              </View>

              {/* Checklist */}
              {!isChecklistExploded ? (
                <Animated.View style={[styles.checklistCard, { backgroundColor: colors.card, borderColor: colors.border }, checklistAnimatedStyle]}>
                  <View style={styles.checklistHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>FIRST 24 HOURS</Text>
                  </View>

                  {activeChecklist.map((item, i) => {
                    const done = completedItems.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.checkItem, i < activeChecklist.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          toggleChecklistItem(item.id);
                        }}
                      >
                        <View style={[styles.checkBox, { borderColor: done ? colors.primary : colors.border, backgroundColor: done ? colors.primary : 'transparent' }]}>
                          {done && <Feather name="check" size={12} color={colors.background} />}
                        </View>
                        <View style={styles.checkTexts}>
                          <Text style={[styles.checkTitle, { color: done ? colors.mutedForeground : colors.foreground }]}>{item.title}</Text>
                          <Text style={[styles.checkSub, { color: colors.mutedForeground }]}>{item.timeEst}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              ) : (
                <View style={styles.newChecklistContainer}>
                  <TextInput
                    style={[styles.newListInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                    placeholder="E.g. Buy groceries..."
                    placeholderTextColor={colors.mutedForeground}
                    value={newItemText}
                    onChangeText={setNewItemText}
                  />
                  <TouchableOpacity style={[styles.newChecklistBtn, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={handleResetChecklist}>
                    <Feather name="plus" size={18} color={colors.ink} />
                    <Text style={[styles.newChecklistText, { color: colors.ink }]}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </BlurView>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  webMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPin: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14201A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pinLabel: {
    fontFamily: 'monospace', // JetBrains Mono fallback
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentOverlayWrapper: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: 'hidden',
  },
  blurWrapper: {
    flex: 1,
  },
  contentOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  cityName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    letterSpacing: 2,
  },
  coords: {
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 1,
  },
  headerRight: { alignItems: 'flex-end' },
  time: {
    fontFamily: 'monospace',
    fontSize: 16,
  },
  date: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 4,
  },
  wordmark: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 54,
    letterSpacing: 6,
    position: 'absolute',
    top: 80,
    right: -20,
    opacity: 0.1,
  },
  quickRow: {
    flexDirection: 'row',
    marginTop: 32,
    justifyContent: 'space-between',
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 9999, // Pill shaped
    marginHorizontal: 4,
  },
  quickText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginLeft: 8,
  },
  progressSection: { marginTop: 40 },
  progressBar: {
    height: 6,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
  },
  progressLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'right',
  },
  checklistCard: {
    marginTop: 24,
    borderRadius: 28, // 28px Custom rounded frames
    borderWidth: 1,
    padding: 20,
  },
  checklistHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 9999, // Pill shape
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkTexts: { marginLeft: 16, flex: 1 },
  checkTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  checkSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  newChecklistContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  newChecklistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 9999,
    gap: 12,
  },
  newChecklistText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  newListInput: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  }
});
