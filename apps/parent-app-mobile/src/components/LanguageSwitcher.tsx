import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n/config';

interface Props {
  style?: object;
}

const LanguageSwitcher: React.FC<Props> = ({ style }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    await i18n.changeLanguage(newLang);
    await setStoredLanguage(newLang);
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={toggleLanguage}
      accessibilityLabel="Change language"
      accessibilityRole="button"
    >
      <View style={styles.button}>
        <Text style={styles.icon}>🌐</Text>
        <Text style={styles.text}>{i18n.language === 'en' ? 'FR' : 'EN'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LanguageSwitcher;
