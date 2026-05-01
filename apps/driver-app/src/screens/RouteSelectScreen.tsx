import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDriverStore } from '../store/useDriverStore';
import { Route } from '../types';
import LanguageSwitcher from '../components/LanguageSwitcher';

const GLASS_BG = 'rgba(15,23,42,0.82)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

function formatStartTime(startTime?: string): string {
  if (!startTime) return '—';
  if (startTime.includes(':')) {
    const [h, m] = startTime.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const numHour = hour % 12 || 12;
    return `${numHour}:${m} ${ampm}`;
  }
  const date = new Date(startTime);
  if (isNaN(date.getTime())) return startTime;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RouteSelectScreen({ navigation }: any) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const driver = useDriverStore((state) => state.driver);
  const setActiveRoute = useDriverStore((state) => state.setActiveRoute);

  const handleSelectRoute = (route: Route) => {
    Alert.alert(
      t('routes.startRoute'),
      t('routes.startRouteConfirm', { name: route.name, direction: route.direction }),
      [
        { text: t('routes.cancel'), style: 'cancel' },
        {
          text: t('routes.start'),
          onPress: () => {
            setActiveRoute(route);
            navigation.navigate('ActiveRoute');
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Route }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectRoute(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={styles.cardHeader}>
            <Text style={styles.routeName}>{item.name}</Text>
          </View>
          <Text style={styles.details}>
            {t('routes.school')}: {item.schoolName || item.schoolId}
          </Text>
          <Text style={styles.details}>
            {t('routes.start')}: {formatStartTime(item.startTime)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <MaterialCommunityIcons
            name="map-marker-path"
            size={48}
            color={item.direction === 'AM' ? '#3b82f6' : '#f59e0b'}
            style={{ opacity: 0.6 }}
          />
          <View style={[styles.dirBadge, item.direction === 'AM' ? styles.dirAM : styles.dirPM]}>
            <Text style={styles.dirText}>{item.direction}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0f172a', '#1e1b4b', '#172554']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.headerProfile}>
        <View style={styles.avatarPlaceholder}>
          <MaterialCommunityIcons name="account" size={32} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>{t('routes.welcome', { name: driver?.name })}</Text>
          <Text style={styles.subHeader}>{t('routes.selectYourRoute')}</Text>
        </View>
        <LanguageSwitcher />
      </View>

      <FlatList
        data={driver?.assignedRoutes || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => useDriverStore.getState().logout()}
      >
        <Text style={styles.logoutText}>{t('routes.logOut')}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.6)',
  },
  header: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  list: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  cardRight: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cardHeader: {
    marginBottom: 8,
  },
  routeName: {
    fontSize: 19,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  dirBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  dirAM: {
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  dirPM: {
    backgroundColor: 'rgba(245,158,11,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  dirText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
  },
  details: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  logoutButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
});
