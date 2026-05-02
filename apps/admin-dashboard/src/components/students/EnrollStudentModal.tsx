import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../common';
import { studentManagementApi } from '../../services/api';

interface EnrollStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EnrollStudentModal: React.FC<EnrollStudentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation(['students']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await studentManagementApi.enrollStudent({
        first_name: firstName,
        last_name: lastName,
        grade,
        ...(address ? { address } : {}),
      });
      setFirstName('');
      setLastName('');
      setGrade('');
      setAddress('');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Enroll failed:', err);
      setError(t('students:enrollModal.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <UserPlus size={24} className="text-primary-500" />
          {t('students:enrollModal.title')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:enrollModal.firstName')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:enrollModal.firstNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:enrollModal.lastName')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:enrollModal.lastNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:enrollModal.grade')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:enrollModal.gradePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:enrollModal.address')}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:enrollModal.addressPlaceholder')}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              {t('students:enrollModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-xl font-bold bg-primary-500 text-white transition-all flex items-center gap-2 ${
                isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary-600 shadow-lg shadow-primary-500/25'
              }`}
            >
              <UserPlus size={18} />
              {isSubmitting
                ? t('students:enrollModal.enrolling')
                : t('students:enrollModal.enrollButton')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EnrollStudentModal;
