import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationApi } from '../../services/api/organization.api';
import type { Board } from '../../services/api/organization.api';

interface BoardFormState {
    name: string;
}

export const BoardsList: React.FC = () => {
    const { user } = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingBoard, setEditingBoard] = useState<Board | null>(null);
    const [form, setForm] = useState<BoardFormState>({ name: '' });
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isOstaAdmin = user?.role === 'OSTA_ADMIN';

    const fetchBoards = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await organizationApi.listBoards();
            setBoards(data);
        } catch {
            setError('Failed to load boards. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchBoards();
    }, []);

    const openCreateForm = () => {
        setEditingBoard(null);
        setForm({ name: '' });
        setFormError(null);
        setShowForm(true);
    };

    const openEditForm = (board: Board) => {
        setEditingBoard(board);
        setForm({ name: board.name });
        setFormError(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingBoard(null);
        setFormError(null);
    };

    const handleSave = async () => {
        if (!form.name.trim() || form.name.trim().length < 2) {
            setFormError('Board name must be at least 2 characters.');
            return;
        }
        setIsSaving(true);
        setFormError(null);
        try {
            if (editingBoard) {
                await organizationApi.updateBoard(editingBoard.id, { name: form.name.trim() });
            } else {
                await organizationApi.createBoard({ name: form.name.trim() });
            }
            closeForm();
            await fetchBoards();
        } catch {
            setFormError('Failed to save board. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (board: Board) => {
        if (!window.confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
        try {
            await organizationApi.deleteBoard(board.id);
            await fetchBoards();
        } catch {
            setError('Failed to delete board.');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">School Boards</h1>
                {isOstaAdmin && (
                    <button
                        onClick={openCreateForm}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        + Add Board
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            {showForm && (
                <div className="mb-6 p-5 bg-dashboard-card rounded-xl border border-white/10">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        {editingBoard ? 'Edit Board' : 'Create Board'}
                    </h2>
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-white/60 mb-1">Board Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ name: e.target.value })}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. Durham District School Board"
                                maxLength={120}
                            />
                            {formError && <p className="text-red-400 text-xs mt-1">{formError}</p>}
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            {isSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                            onClick={closeForm}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-white/60">Loading…</div>
            ) : (
                <div className="bg-dashboard-card rounded-xl overflow-hidden shadow-glass border border-white/10">
                    <table className="w-full text-left text-white">
                        <thead className="bg-white/5 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Schools</th>
                                {isOstaAdmin && <th className="px-6 py-4">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {boards.map(board => (
                                <tr key={board.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">{board.name}</td>
                                    <td className="px-6 py-4 text-white/60">{board.schools?.length ?? '—'}</td>
                                    {isOstaAdmin && (
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openEditForm(board)}
                                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(board)}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {boards.length === 0 && (
                                <tr>
                                    <td colSpan={isOstaAdmin ? 3 : 2} className="px-6 py-8 text-center text-white/50">
                                        No boards found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
