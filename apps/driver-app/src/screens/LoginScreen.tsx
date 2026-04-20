import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDriverStore } from '../store/useDriverStore';

const GLASS_BG = 'rgba(15,23,42,0.82)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useDriverStore((state) => state.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e1b4b', '#172554']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.card}>
        <Text style={styles.title}>SBTM Driver</Text>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons
            name="card-account-details-outline"
            size={20}
            color="rgba(255,255,255,0.5)"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Driver ID"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialCommunityIcons
            name="line-scan"
            size={20}
            color="rgba(255,255,255,0.5)"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity onPress={handleLogin} disabled={isLoading}>
          <LinearGradient
            colors={['#020617', '#3b82f6', '#4c1d95']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.button}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>LOGIN</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.faceIdContainer}>
          <MaterialCommunityIcons name="face-recognition" size={42} color="#38bdf8" />
          <Text style={styles.faceIdText}>FaceID</Text>
          <Text style={styles.faceIdSubtext}>Tap to scan FaceID</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 20,
    padding: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 36,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#fff',
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
  },
  faceIdContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  faceIdText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 12,
  },
  faceIdSubtext: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
});
