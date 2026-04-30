import React from 'react';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

/**
 * SVG bus / stop / school markers that mirror the parent-dashboard web
 * portal's Map.tsx (createBusIcon, createStopIcon, SCHOOL_ICON).
 *
 * Status colors:
 *   normal  -> #22c55e (green)
 *   delay   -> #eab308 (amber)
 *   emergency -> #ef4444 (red)
 *   offline -> #94a3b8 (gray)
 */
export type BusStatus = 'normal' | 'delay' | 'emergency' | 'offline';

const BUS_STATUS_COLORS: Record<BusStatus, { fill: string; border: string }> = {
  normal: { fill: '#22c55e', border: '#15803d' },
  delay: { fill: '#eab308', border: '#a16207' },
  emergency: { fill: '#ef4444', border: '#b91c1c' },
  offline: { fill: '#94a3b8', border: '#475569' },
};

export function BusMarker({ status = 'normal', size = 36 }: { status?: BusStatus; size?: number }) {
  const { fill, border } = BUS_STATUS_COLORS[status];
  // Mirrors web portal createBusIcon: solid colored circle with a 3px border
  // and the same Material-style bus glyph rendered in white.
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={16.5} fill={fill} stroke={border} strokeWidth={3} />
      {/* Same bus path as apps/parent-dashboard/web/src/pages/Map.tsx createBusIcon
          (24x24 viewBox), translated and scaled into the 36x36 circle. */}
      <Path
        transform="translate(9 9) scale(0.75)"
        d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"
        fill="#fff"
      />
    </Svg>
  );
}

export function ChildStopMarker({ sequence }: { sequence: number }) {
  // Blue 28px circle + person silhouette + white sequence badge top-right
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Circle cx={18} cy={20} r={14} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
      {/* Person silhouette */}
      <Circle cx={18} cy={16} r={3} fill="#fff" />
      <Path d="M11 26 C11 22, 14 20, 18 20 C22 20, 25 22, 25 26 Z" fill="#fff" />
      {/* Sequence badge */}
      <Circle cx={29} cy={7} r={6} fill="#fff" stroke="#3b82f6" strokeWidth={1.5} />
      <SvgText x={29} y={10} fontSize={8} fontWeight="bold" fill="#3b82f6" textAnchor="middle">
        {String(sequence)}
      </SvgText>
    </Svg>
  );
}

export function StopMarker({ sequence }: { sequence: number }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={9} fill="rgba(156,163,175,0.7)" stroke="#fff" strokeWidth={1.5} />
      <SvgText x={11} y={14} fontSize={9} fontWeight="bold" fill="#fff" textAnchor="middle">
        {String(sequence)}
      </SvgText>
    </Svg>
  );
}

export function SchoolMarker() {
  // Mirrors web portal SCHOOL_ICON: purple circle with white border and a
  // graduation-cap glyph (lucide School / Material school).
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={16.5} fill="#8b5cf6" stroke="#fff" strokeWidth={3} />
      {/* Same path as apps/parent-dashboard/web/src/pages/Map.tsx SCHOOL_ICON */}
      <Path
        transform="translate(9 9) scale(0.75)"
        d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"
        fill="#fff"
      />
    </Svg>
  );
}

export const POLYLINE_COLORS = {
  AM: '#3b82f6',
  PM: '#f59e0b',
};
