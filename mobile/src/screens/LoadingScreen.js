import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

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

      {/* pulsing brand mark */}
      <Animated.View style={[styles.markRing, { transform: [{ scale }], shadowRadius: ring }]}>
        <View style={styles.mark}>
          <Text style={styles.markTxt}>K</Text>
        </View>
      </Animated.View>
      <Text style={styles.brand}>Kobciye</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 9999 },
  markRing: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#fff', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  mark: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  markTxt: { color: '#0A2E6B', fontSize: 32, fontWeight: '800' },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5, opacity: 0.92, marginTop: 14 },
});
