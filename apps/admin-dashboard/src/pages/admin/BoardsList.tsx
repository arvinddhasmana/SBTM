import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api/api-client';

interface Board {
    id: string;
    name: string;
}

export const BoardsList: React.FC = () => {
    const { token } = useAuth();
    const [boards, setBoards] = useState<Board[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const response = await apiClient.get<Board[]>('/api/v1/boards');
                setBoards(response.data);
            } catch (error) {
                console.error('Failed to fetch boards', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBoards();
    }, [token]);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-6">School Boards</h1>

            {isLoading ? (
                <div className="text-white">Loading...</div>
            ) : (
                <div className="bg-dashboard-card rounded-xl overflow-hidden shadow-glass border border-white/10">
                    <table className="w-full text-left text-white">
                        <thead className="bg-white/5 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Name</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {boards.map(board => (
                                <tr key={board.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{board.id}</td>
                                    <td className="px-6 py-4">{board.name}</td>
                                </tr>
                            ))}
                            {boards.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="px-6 py-8 text-center text-white/50">No boards found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
