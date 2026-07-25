import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/MapView';

// Mock Delhi Coordinates
const DELHI_CENTER = { latitude: 28.6139, longitude: 77.2090 };

export default function AddPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Geofence check state
  const [isOutsideDelhi, setIsOutsideDelhi] = useState(false);

  // Debounce loop (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Mock Google Places API behavior
  useEffect(() => {
    if (debouncedQuery.length > 3) {
      setIsSearching(true);
      setTimeout(() => {
        setIsSearching(false);
        // If the user types "Mumbai", simulate geofence trigger
        if (debouncedQuery.toLowerCase().includes('mumbai') || debouncedQuery.toLowerCase().includes('bangalore')) {
          setIsOutsideDelhi(true);
        } else {
          setIsOutsideDelhi(false);
          // Simulate finding a place inside Delhi and animating to it
          const lat = DELHI_CENTER.latitude + (Math.random() - 0.5) * 0.05;
          const lng = DELHI_CENTER.longitude + (Math.random() - 0.5) * 0.05;
          setSelectedCoord({ latitude: lat, longitude: lng });
          
          if (mapRef.current && mapRef.current.animateCamera) {
            mapRef.current.animateCamera(
              {
                center: { latitude: lat, longitude: lng },
                pitch: 45,
                heading: 0,
                altitude: 1000,
                zoom: 16,
              },
              { duration: 1500 } // Animated camera flight path (1500ms duration)
            );
          }
        }
      }, 600);
    }
  }, [debouncedQuery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Upfront Map */}
      <View style={styles.mapWrapper}>
        {Platform.OS !== 'web' ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: DELHI_CENTER.latitude,
              longitude: DELHI_CENTER.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            customMapStyle={[
              { elementType: "geometry", stylers: [{ color: "#F9F8F4" }] }, // Alabaster base
              { elementType: "labels.text.stroke", stylers: [{ color: "#F9F8F4" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#14201A" }] }, // Forest Ink text
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#E8E6DF" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#3A5245" }] }, // Moss Moss water
            ]}
          >
            {selectedCoord && (
              <Marker coordinate={selectedCoord}>
                <View style={[styles.markerRing, { borderColor: colors.secondary }]}>
                  <View style={[styles.markerCore, { backgroundColor: colors.secondary }]} />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={[styles.webFallback, { backgroundColor: colors.background }]}>
            <Text style={{ color: colors.mutedForeground }}>Map view disabled on Web</Text>
          </View>
        )}
      </View>

      {/* Header Back Button */}
      <TouchableOpacity 
        style={[styles.backBtn, { top: insets.top + 16, backgroundColor: colors.glassDark }]}
        onPress={() => router.back()}
      >
        <Feather name="arrow-left" size={24} color={colors.foreground} />
      </TouchableOpacity>

      {/* Geofence Overlay */}
      {isOutsideDelhi && (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
          <View style={[styles.geofenceOverlay, { backgroundColor: colors.glassDark }]}>
            <Feather name="map-pin" size={48} color={colors.destructive} />
            <Text style={[styles.geofenceTitle, { color: colors.foreground }]}>Out of Bounds</Text>
            <Text style={[styles.geofenceDesc, { color: colors.foreground }]}>
              SteadyNest is currently exclusive to the capital. Expansion beyond Delhi coming soon.
            </Text>
            <TouchableOpacity 
              style={[styles.geofenceBtn, { backgroundColor: colors.foreground }]}
              onPress={() => {
                setQuery('');
                setDebouncedQuery('');
                setIsOutsideDelhi(false);
              }}
            >
              <Text style={[styles.geofenceBtnText, { color: colors.background }]}>Search within Delhi NCR</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}

      {/* Bottom Sheet Context */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.bottomSheet}>
        <BlurView intensity={60} tint="light" style={[styles.sheetBlur, { paddingBottom: insets.bottom + 20, backgroundColor: colors.glass }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add New Property</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>Locate your property precisely on the grid.</Text>

          <View style={[styles.inputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="search" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Enter exact address..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: selectedCoord ? colors.primary : colors.muted, opacity: selectedCoord ? 1 : 0.5 }]}
            disabled={!selectedCoord}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            }}
          >
            <Text style={[styles.submitText, { color: selectedCoord ? colors.background : colors.mutedForeground }]}>
              {selectedCoord ? 'Confirm Location & List' : 'Waiting for coordinate sync...'}
            </Text>
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    ...StyleSheet.absoluteFillObject,
    bottom: 200,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerRing: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  markerCore: {
    width: 10,
    height: 10,
    borderRadius: 9999,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 9999, // Pill shaped
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetBlur: {
    paddingHorizontal: 24,
    paddingTop: 32,
    borderTopLeftRadius: 36, // Custom rounded frames
    borderTopRightRadius: 36,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
  },
  sheetSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderRadius: 9999, // Pill-shaped fully
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    height: '100%',
  },
  submitBtn: {
    height: 56,
    borderRadius: 9999, // Pill-shaped
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  geofenceOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  geofenceTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  geofenceDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    opacity: 0.8,
  },
  geofenceBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 9999, // Pill-shaped
  },
  geofenceBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
