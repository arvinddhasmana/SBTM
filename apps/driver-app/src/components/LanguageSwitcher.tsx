import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n/config';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    await i18n.changeLanguage(newLang);
    await setStoredLanguage(newLang);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleLanguage}
      accessibilityLabel="Change language"
      accessibilityRole="button"
    >
      <View style={styles.button}>
        <Text style={styles.icon}>🌐</Text>
        <Text style={styles.text}>
          {i18n.language === 'en' ? 'FR' : 'EN'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default LanguageSwitcher;
