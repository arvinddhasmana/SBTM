/**
 * Web stub for react-native-maps.
 * react-native-maps uses native-only modules that cannot bundle for web.
 * This stub replaces the library for the web platform in E2E tests.
 */
import React from 'react';
import { View } from 'react-native';

const MapView = React.forwardRef(function MapView({ children, style }, ref) {
  return (
    React.createElement(View, { style: [{ backgroundColor: '#1e293b', flex: 1 }, style], ref },
      children
    )
  );
});
MapView.displayName = 'MapView';

function Marker({ children }) {
  return React.createElement(View, null, children);
}
Marker.displayName = 'Marker';

function Polyline() {
  return null;
}
Polyline.displayName = 'Polyline';

const PROVIDER_GOOGLE = 'google';

export { Marker, Polyline, PROVIDER_GOOGLE };
export default MapView;
