import React, { useState, useEffect } from 'react';
import { Edit2, X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../common';
import { studentManagementApi } from '../../services/api';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
  onSuccess: () => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const { t } = useTranslation(['students']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      setFirstName(student.first_name || '');
      setLastName(student.last_name || '');
      setGrade(student.grade || '');
      setAddress(student.address || '');
      setError(null);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await studentManagementApi.updateStudent(student.id, {
        first_name: firstName,
        last_name: lastName,
        grade,
        address: address || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Update failed:', err);
      setError(t('students:editModal.error'));
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
          <Edit2 size={24} className="text-primary-500" />
          {t('students:editModal.title')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:editModal.firstName')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:editModal.firstNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:editModal.lastName')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:editModal.lastNamePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:editModal.grade')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:editModal.gradePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t('students:editModal.address')}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-dashboard-bg border border-dashboard-border text-white text-sm focus:border-primary-500 transition-colors"
              placeholder={t('students:editModal.addressPlaceholder')}
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
              {t('students:editModal.cancel')}
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
              <Save size={18} />
              {isSubmitting ? t('students:editModal.saving') : t('students:editModal.saveButton')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditStudentModal;
