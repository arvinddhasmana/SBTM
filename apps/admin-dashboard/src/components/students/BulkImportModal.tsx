import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Card } from '../common';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File) => Promise<{ success: number; failed: number; errors: string[] }>;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await onImport(file);
            setResult(res);
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <Card className="w-full max-w-xl relative overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Upload size={24} className="text-primary-500" />
                    Bulk Import Students
                </h2>

                <div className="space-y-6">
                    <div className="p-8 border-2 border-dashed border-dashboard-border rounded-2xl text-center">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="flex flex-col items-center gap-4 cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                                <FileText size={32} />
                            </div>
                            <div>
                                <p className="text-white font-medium">
                                    {file ? file.name : 'Click to select CSV file'}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Supported format: CSV (max 10MB)
                                </p>
                            </div>
                        </label>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-xl flex flex-col gap-2 ${result.failed === 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'
                            }`}>
                            <div className="flex items-center gap-2 font-medium">
                                {result.failed === 0 ? (
                                    <CheckCircle2 size={18} className="text-green-500" />
                                ) : (
                                    <AlertCircle size={18} className="text-orange-500" />
                                )}
                                <span className={result.failed === 0 ? 'text-green-500' : 'text-orange-500'}>
                                    Import Complete
                                </span>
                            </div>
                            <p className="text-sm text-slate-300">
                                Successfully imported <strong>{result.success}</strong> students.
                                {result.failed > 0 && <span> Failed to import <strong>{result.failed}</strong>.</span>}
                            </p>
                            {result.errors.length > 0 && (
                                <div className="mt-2 text-xs text-slate-400 max-h-32 overflow-y-auto bg-black/20 p-2 rounded-lg">
                                    {result.errors.map((err, i) => (
                                        <div key={i}>{err}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!file || isUploading || !!result}
                            className={`px-6 py-2 rounded-xl font-bold bg-primary-500 text-white transition-all ${!file || isUploading || !!result ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                                }`}
                        >
                            {isUploading ? 'Uploading...' : 'Start Import'}
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BulkImportModal;
