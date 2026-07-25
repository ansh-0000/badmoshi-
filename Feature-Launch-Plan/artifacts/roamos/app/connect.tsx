import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import MapView, { Marker } from '@/components/MapView';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useColors } from '@/hooks/useColors';
import { FOOD_PLACES } from '@/constants/data';
import { API_BASE } from '@/constants/api';
import { useApp } from '@/context/AppContext';

const PEOPLE = [
  { id: '1', name: 'Aarav', age: 28, bio: 'Looking for the best Chole Bhature in Delhi!', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80' },
  { id: '2', name: 'Sophia', age: 25, bio: 'Digital nomad from UK. Love aesthetic cafes.', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' },
  { id: '3', name: 'Karan', age: 30, bio: 'Coffee enthusiast & startup founder.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80' }
];

export default function EatDrinkScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchData, setMatchData] = useState<{chatId: string, person: typeof PEOPLE[0]} | null>(null);
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  const processSwipe = async (targetId: string, action: 'like' | 'pass') => {
    try {
      const res = await fetch(`${API_BASE}/match/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, action })
      });
      const data = await res.json();
      if (data.match) {
        setMatchData({ chatId: data.chatId, person: PEOPLE[currentIndex] });
      }
    } catch (e) {
      console.error("Failed to record swipe", e);
    }
  };

  const handleNext = (direction: 'left' | 'right') => {
    Haptics.notificationAsync(
      direction === 'right' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    
    const person = PEOPLE[currentIndex];
    processSwipe(person.id, direction === 'right' ? 'like' : 'pass');
    
    setCurrentIndex(prev => prev + 1);
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = (event.translationX / 300) * 20; // Max 20 deg rotation
    })
    .onEnd((event) => {
      if (event.translationX > 120) {
        translateX.value = withSpring(500);
        runOnJS(handleNext)('right');
      } else if (event.translationX < -120) {
        translateX.value = withSpring(-500);
        runOnJS(handleNext)('left');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` }
      ]
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map Background */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: 28.5535,
            longitude: 77.1934,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          customMapStyle={mapStyleDark}
        >
          {FOOD_PLACES.map((place, index) => (
             <Marker 
               key={place.id}
               coordinate={{ latitude: 28.5535 + (index * 0.01), longitude: 77.1934 + (index * 0.01) }}
               title={place.name}
               description={place.cuisine}
             />
          ))}
        </MapView>
      </View>

      {/* Gradient Overlay for Top Header */}
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={[styles.topGradient, { height: topInset + 60 }]}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>EAT & DRINK</Text>
          <Text style={styles.subtitle}>Discover places & meet locals</Text>
        </View>
      </View>

      {/* Swipe Discovery Interface */}
      <View style={[styles.swipeContainer, { paddingBottom: bottomInset + 80 }]}>
        {currentIndex < PEOPLE.length ? (
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, animatedCardStyle]}>
              <Image source={{ uri: PEOPLE[currentIndex].image }} style={styles.cardImage} />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.foreground }]}>{PEOPLE[currentIndex].name}, {PEOPLE[currentIndex].age}</Text>
                <Text style={[styles.cardBio, { color: colors.mutedForeground }]}>{PEOPLE[currentIndex].bio}</Text>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted }]} onPress={() => handleNext('left')}>
                  <Feather name="x" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleNext('right')}>
                  <Feather name="coffee" size={24} color={colors.ink} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </GestureDetector>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' }]}>
            <Feather name="check-circle" size={48} color={colors.primary} />
            <Text style={[styles.cardName, { color: colors.foreground, marginTop: 16 }]}>You're all caught up!</Text>
            <Text style={[styles.cardBio, { color: colors.mutedForeground, textAlign: 'center', marginTop: 8 }]}>
              No more locals around you right now. Check back later!
            </Text>
          </View>
        )}
      </View>

      {/* Match Modal */}
      {matchData && (
        <Modal transparent animationType="fade">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
             <Text style={{ fontSize: 40, fontFamily: 'Inter_700Bold', color: colors.primary, marginBottom: 40 }}>It's a Match!</Text>
             
             <View style={{ flexDirection: 'row', gap: 20, marginBottom: 40 }}>
                {/* Current User Avatar mock */}
                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.muted, overflow: 'hidden', borderWidth: 2, borderColor: colors.primary }}>
                   <Feather name="user" size={50} color={colors.foreground} style={{ marginTop: 25, alignSelf: 'center' }} />
                </View>
                {/* Target Avatar */}
                <Image source={{ uri: matchData.person.image }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: colors.primary }} />
             </View>

             <Text style={{ fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 40, fontFamily: 'Inter_400Regular' }}>
               You and {matchData.person.name} have liked each other.
             </Text>

             <TouchableOpacity 
               style={{ backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30, width: '100%', alignItems: 'center', marginBottom: 16 }}
               onPress={() => {
                 setMatchData(null);
                 router.push(`/chat/${matchData.chatId}`);
               }}
             >
               <Text style={{ color: colors.ink, fontSize: 18, fontFamily: 'Inter_600SemiBold' }}>Send a Message</Text>
             </TouchableOpacity>

             <TouchableOpacity 
               style={{ backgroundColor: 'transparent', paddingVertical: 16, width: '100%', alignItems: 'center' }}
               onPress={() => setMatchData(null)}
             >
               <Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: 'Inter_500Medium' }}>Keep Swiping</Text>
             </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    zIndex: 10,
  },
  backBtn: { paddingBottom: 4 },
  headerCenter: { flex: 1 },
  screenTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#fff' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, color: 'rgba(255,255,255,0.8)' },
  swipeContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  card: {
    width: '100%',
    height: 400,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#eee'
  },
  cardInfo: {
    padding: 20,
    paddingBottom: 0,
  },
  cardName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  cardBio: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 20,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  }
});

const mapStyleDark = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
];
