import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Mail, Lock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useMock } from '../services/api';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const Login: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('auth:errors.required'));
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED_ROLE') {
        setError(t('auth:errors.unauthorized'));
      } else {
        setError(t('auth:errors.invalid'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/25 mb-4">
            <Bus size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('common:app.title')}</h1>
          {useMock ? (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-500 text-xs font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              {t('auth:mockMode')}
              <button
                onClick={() => {
                  localStorage.removeItem('VITE_USE_MOCK');
                  window.location.search = '';
                  window.location.reload();
                }}
                className="ml-2 hover:text-white transition-colors"
              >
                ({t('auth:mockModeExit')})
              </button>
            </div>
          ) : (
            <p className="text-slate-400 mt-2">{t('auth:subtitle')}</p>
          )}
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth:email')}
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth:emailPlaceholder')}
                  className="input-field pl-12"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth:password')}
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth:passwordPlaceholder')}
                  className="input-field pl-12"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? t('auth:submitting') : t('auth:submit')}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t('common:app.description')}
        </p>
      </div>
    </div>
  );
};

export default Login;
