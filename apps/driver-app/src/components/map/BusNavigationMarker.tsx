import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RouteStatus, STATUS_COLORS } from '../../hooks/useRouteStatus';

interface Props {
  status: RouteStatus;
}

export default function BusNavigationMarker({ status }: Props) {
  const color = STATUS_COLORS[status];

  return (
    <View style={styles.container}>
      <Svg width={36} height={36} viewBox="0 0 24 24">
        <Path
          d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"
          fill={color}
          stroke="white"
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
