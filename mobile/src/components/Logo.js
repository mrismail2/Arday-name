import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';

/* Kobciye brand mark — a rounded navy→blue tile with a gold graduation-cap
   accent over a "K". Reusable everywhere a logo is shown. */
export default function Logo({ size = 40, rounded = 0.28 }) {
  const r = size * rounded;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#13458F" />
          <Stop offset="1" stopColor="#0A2E6B" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="48" height="48" rx={r * 48 / size} fill="url(#lg)" />
      {/* graduation cap */}
      <Path d="M24 12 9 18.5l15 6.5 12-5.2V28" fill="none" stroke="#CFAD5E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.5 22.5V28.5c0 1.8 4.3 3.4 9.5 3.4s9.5-1.6 9.5-3.4v-6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
