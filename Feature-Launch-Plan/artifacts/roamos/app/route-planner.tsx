import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { CITIES } from '@/constants/data';
import { useApp } from '@/context/AppContext';
import { API_BASE_URL } from '@/lib/api';

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '@/components/MapView';

export default function RoutePlannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { currentCityId } = useApp();
  
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  
  // Hardcoded for demo: origin and destination based on city
  const cityInfo = CITIES.find(c => c.id === currentCityId);
  const [lat, lng] = cityInfo?.coords.split('  ').map(s => parseFloat(s)) || [28.6139, 77.2090];
  
  const origin = { lat, lng };
  // Add some distance for destination
  const destination = { lat: lat + 0.05, lng: lng + 0.05 };
  
  useEffect(() => {
    fetchRoute();
  }, []);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/routes/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRouteData(data);
      }
    } catch (e) {
      console.warn("Failed to fetch route", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Map */}
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: origin.lat,
              longitude: origin.lng,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="Origin" />
            <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="Destination" />
            <Polyline 
              coordinates={[
                { latitude: origin.lat, longitude: origin.lng },
                { latitude: destination.lat, longitude: destination.lng }
              ]} 
              strokeColor={colors.primary} 
              strokeWidth={4} 
            />
          </MapView>
        ) : (
          <View style={[styles.webMapFallback, { backgroundColor: colors.card }]}>
            <Feather name="map" size={48} color={colors.mutedForeground} />
            <Text style={[styles.webMapText, { color: colors.mutedForeground }]}>
              Interactive Map available on native Android/iOS.
            </Text>
          </View>
        )}

        {/* Back Button Overlay */}
        <TouchableOpacity 
          style={[styles.backButton, { top: insets.top + 16, backgroundColor: colors.background }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet for Options */}
      <View style={[styles.bottomSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Transport Options</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : routeData ? (
          <ScrollView style={styles.optionsList}>
            {routeData.options.map((opt: any) => (
              <TouchableOpacity 
                key={opt.id} 
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => Haptics.selectionAsync()}
              >
                <View style={styles.optionHeader}>
                  <Text style={{ fontSize: 24 }}>{opt.icon}</Text>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, { color: colors.foreground }]}>{opt.name}</Text>
                    <Text style={[styles.optionTime, { color: colors.mutedForeground }]}>{opt.durationFormatted}</Text>
                  </View>
                </View>
                <Text style={[styles.optionPrice, { color: colors.primary }]}>{opt.priceFormatted}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load options.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMapText: {
    marginTop: 16,
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSheet: {
    height: '45%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  optionsList: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionInfo: {
    marginLeft: 16,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionTime: {
    fontSize: 14,
    marginTop: 4,
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 24,
  },
});
