import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Logo from '../components/Logo';

/* Splash / loading screen — a faithful port of the web app's kob-loader:
   navy→blue gradient, a pulsing circular brand mark, and "Kobciye".
   Calls onDone after a short delay. */
export default function LoadingScreen({ onDone }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    // continuous pulse (scale 1 → 1.08), matching kobPulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone && onDone());
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ring = pulse.interpolate({ inputRange: [0, 1], outputRange: [6, 12] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      {/* navy → blue gradient background (160deg #0A1F50 → #2F62E8) */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor="#0A1F50" />
            <Stop offset="1" stopColor="#2F62E8" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#g)" />
      </Svg>

      {/* pulsing brand mark — official Kobciye wordmark (white) */}
      <Animated.View style={[styles.markRing, { transform: [{ scale }], shadowRadius: ring }]}>
        <Logo size={52} variant="white" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 9999 },
  markRing: {
    paddingVertical: 26, paddingHorizontal: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#fff', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
});
