import React, { forwardRef } from 'react';
import { View } from 'react-native';

export const useCameraPermissions = () => {
  return [{ granted: false }, () => Promise.resolve({ granted: false })];
};

export const CameraView = forwardRef((props: any, ref) => {
  return <View style={props.style} />;
});

CameraView.displayName = 'CameraView';
