import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface School {
    id: string;
    name: string;
    boardId: string;
}

export const SchoolsList: React.FC = () => {
    const { token, user } = useAuth();
    const [schools, setSchools] = useState<School[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                let url = 'http://localhost:3001/schools';
                if (user?.boardId && user.role === 'BOARD_ADMIN') {
                    url += `?boardId=${user.boardId}`;
                }

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setSchools(data);
            } catch (error) {
                console.error('Failed to fetch schools', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchools();
    }, [token, user]);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Schools</h1>
                {(user?.role === 'OSTA_ADMIN' || user?.role === 'BOARD_ADMIN') && (
                    <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors">
                        Add School
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="text-white">Loading...</div>
            ) : (
                <div className="bg-dashboard-card rounded-xl overflow-hidden shadow-glass border border-white/10">
                    <table className="w-full text-left text-white">
                        <thead className="bg-white/5 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Board ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {schools.map(school => (
                                <tr key={school.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{school.id}</td>
                                    <td className="px-6 py-4">{school.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{school.boardId}</td>
                                </tr>
                            ))}
                            {schools.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-white/50">No schools found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
