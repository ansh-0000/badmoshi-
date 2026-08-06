import React from 'react';
import { NativeModules } from 'react-native';
import WebMapView, { Marker as WebMarker, Polyline as WebPolyline, PROVIDER_GOOGLE as WEB_PROVIDER_GOOGLE } from './MapView.web';

let NativeMapView: any = null;
let NativeMarker: any = WebMarker;
let NativePolyline: any = WebPolyline;
let NativeProviderGoogle: any = WEB_PROVIDER_GOOGLE;

const hasNativeMaps = !!(
  NativeModules.RNMapsAirModule || 
  NativeModules.AirMapModule || 
  NativeModules.RNMapsAirModuleExpo
);

if (hasNativeMaps) {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default;
    NativeMarker = Maps.Marker;
    NativePolyline = Maps.Polyline;
    NativeProviderGoogle = Maps.PROVIDER_GOOGLE;
  } catch (e) {
    // Fallback to web mock if native import fails
  }
}

export const Marker = NativeMarker;
export const Polyline = NativePolyline;
export const PROVIDER_GOOGLE = NativeProviderGoogle;

export default function MapViewWrapper(props: any) {
  if (hasNativeMaps && NativeMapView) {
    try {
      return <NativeMapView {...props} />;
    } catch (e) {
      return <WebMapView {...props} />;
    }
  }
  return <WebMapView {...props} />;
}
