import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useParentStore } from '../store/useParentStore';
import { NotificationService } from '../services/NotificationService';
import { GlassCard, GlassButton } from '../components';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useParentStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);

      // Initialize notifications after successful login
      await NotificationService.initialize();
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
        <LanguageSwitcher />
      </View>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🚌</Text>
          </View>
          <Text style={styles.title}>SBTM Parent</Text>
          <Text style={styles.subtitle}>Track your child's journey</Text>
        </View>

        {/* Login Form */}
        <GlassCard style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
            testID="login-email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
            onSubmitEditing={handleLogin}
            testID="login-password"
          />

          <GlassButton
            title="Log In"
            onPress={handleLogin}
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            style={styles.loginButton}
            testID="login-submit"
          />

          {/* Demo Credentials Hint */}
          <Text style={styles.hint}>Demo: parent1@sbtm.demo / Admin123!</Text>
        </GlassCard>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  formCard: {
    width: '100%',
    padding: 24,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  loginButton: {
    marginTop: 10,
  },
  hint: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    marginTop: 20,
  },
});
