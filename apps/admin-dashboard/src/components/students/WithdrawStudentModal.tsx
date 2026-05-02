import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../common';
import { studentManagementApi } from '../../services/api';

interface WithdrawStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any | null;
  onSuccess: () => void;
}

const WithdrawStudentModal: React.FC<WithdrawStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const { t } = useTranslation(['students']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await studentManagementApi.updateStudent(student.id, { status: 'WITHDRAWN' });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Withdraw failed:', err);
      setError(t('students:withdrawModal.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <AlertTriangle size={24} className="text-red-400" />
          {t('students:withdrawModal.title')}
        </h2>

        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-white text-sm">
              {t('students:withdrawModal.confirmQuestion')}{' '}
              <strong>
                {student.first_name} {student.last_name}
              </strong>
              ?
            </p>
            <p className="text-slate-400 text-xs mt-2">{t('students:withdrawModal.warningText')}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              {t('students:withdrawModal.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-xl font-bold bg-red-500 text-white transition-all ${
                isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-red-600 shadow-lg shadow-red-500/25'
              }`}
            >
              {isSubmitting
                ? t('students:withdrawModal.withdrawing')
                : t('students:withdrawModal.confirmButton')}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WithdrawStudentModal;
