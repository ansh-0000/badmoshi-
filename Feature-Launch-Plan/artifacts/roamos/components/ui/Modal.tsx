import React from 'react';
import { Modal as RNModal, View, StyleSheet, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ViewProps } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface ModalProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  variant?: 'center' | 'bottom';
}

export function Modal({ visible, onClose, variant = 'center', style, children, ...props }: ModalProps) {
  const colors = useColors();

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType={variant === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.backdrop, { backgroundColor: colors.foreground + '40' }]} />
        </TouchableWithoutFeedback>
        
        <View style={variant === 'center' ? styles.centerContainer : styles.bottomContainer}>
          <View
            style={[
              styles.content,
              variant === 'bottom' && styles.bottomContent,
              { backgroundColor: colors.background, borderRadius: colors.radius },
              style
            ]}
            {...props}
          >
            {variant === 'bottom' && <View style={styles.handle} />}
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bottomContent: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  }
});
