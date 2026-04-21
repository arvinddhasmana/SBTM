/**
 * DashedPolyline
 *
 * react-native-maps' built-in `lineDashPattern` is unreliable on Android
 * (silently drops the dash pattern on many devices/versions).
 *
 * This component works around it by splitting the path into alternating
 * visible dash segments and skipped gap segments, then rendering each
 * dash segment as its own solid <Polyline>.
 */
import React, { useMemo } from 'react';
import { Polyline, LatLng } from 'react-native-maps';

// ── Geometry helpers ─────────────────────────────────────────────────

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Linear interpolation between two lat/lng points by fraction t∈[0,1]. */
function lerp(p1: LatLng, p2: LatLng, t: number): LatLng {
  return {
    latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
    longitude: p1.longitude + (p2.longitude - p1.longitude) * t,
  };
}

/**
 * Converts a polyline into an array of dash-segment coordinate arrays.
 * Each entry in the output array is one visible dash (≥2 points).
 */
function buildDashSegments(coords: LatLng[], dashLenM: number, gapLenM: number): LatLng[][] {
  if (coords.length < 2) return [];

  const result: LatLng[][] = [];
  let isDash = true; // start with a visible dash
  let phaseLeft = dashLenM; // remaining meters in current phase
  let currentDash: LatLng[] = [coords[0]];

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const edgeLen = haversineM(p1, p2);

    let walked = 0; // meters walked along this edge so far

    while (edgeLen - walked > 0.001) {
      const edgeLeft = edgeLen - walked;

      if (phaseLeft <= edgeLeft) {
        // Phase boundary falls within this edge: compute the split point
        const t = (walked + phaseLeft) / edgeLen;
        const splitPt = lerp(p1, p2, t);

        if (isDash) {
          currentDash.push(splitPt);
          if (currentDash.length >= 2) result.push(currentDash);
          currentDash = [];
        }

        walked += phaseLeft;
        isDash = !isDash;
        phaseLeft = isDash ? dashLenM : gapLenM;
        if (isDash) currentDash = [splitPt];
      } else {
        // This edge ends before the phase ends
        if (isDash) currentDash.push(p2);
        phaseLeft -= edgeLeft;
        walked = edgeLen;
      }
    }
  }

  // Flush any trailing dash that ends exactly at the last coordinate
  if (isDash && currentDash.length >= 2) result.push(currentDash);

  return result;
}

// ── Component ────────────────────────────────────────────────────────

interface DashedPolylineProps {
  coordinates: LatLng[];
  strokeColor?: string;
  strokeWidth?: number;
  /** Visible dash length in metres (default 25m). */
  dashLength?: number;
  /** Gap between dashes in metres (default 15m). */
  gapLength?: number;
  zIndex?: number;
}

export default function DashedPolyline({
  coordinates,
  strokeColor = '#00ff88',
  strokeWidth = 4,
  dashLength = 25,
  gapLength = 15,
  zIndex = 3,
}: DashedPolylineProps) {
  const segments = useMemo(
    () => buildDashSegments(coordinates, dashLength, gapLength),
    [coordinates, dashLength, gapLength],
  );

  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, idx) => (
        <Polyline
          key={idx}
          coordinates={seg}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          zIndex={zIndex}
        />
      ))}
    </>
  );
}
