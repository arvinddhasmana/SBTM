import React from 'react';
import Svg, { Circle, Path, Rect, G, Text as SvgText } from 'react-native-svg';

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
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36">
      <Circle cx={18} cy={18} r={16} fill={fill} stroke={border} strokeWidth={2} />
      {/* Bus body */}
      <Rect x={9} y={11} width={18} height={12} rx={2} fill="#fff" />
      <Rect x={11} y={13} width={6} height={4} fill={fill} />
      <Rect x={19} y={13} width={6} height={4} fill={fill} />
      <Circle cx={13} cy={24} r={2} fill="#1f2937" />
      <Circle cx={23} cy={24} r={2} fill="#1f2937" />
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
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={14} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />
      {/* School building */}
      <Path d="M16 7 L24 12 L24 14 L8 14 L8 12 Z" fill="#fff" />
      <Rect x={10} y={14} width={12} height={9} fill="#fff" />
      <Rect x={14} y={17} width={4} height={6} fill="#8b5cf6" />
    </Svg>
  );
}

export const POLYLINE_COLORS = {
  AM: '#3b82f6',
  PM: '#f59e0b',
};
