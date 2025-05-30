import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Link } from 'react-router-dom';

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
}

export default function Dashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get<User[]>('/users')
            .then(res => setUsers(res.data))
            .catch(err => {
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/');
                }
            });
    }, [navigate]);

    const logout = async () => {
        await api.post('/logout');
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                    <div className="space-x-4">
                        <Link
                            to="/roles-permissions"
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                        >
                            Roles & Perms
                        </Link>
                        <button
                            onClick={logout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                        >
                            Logout
                        </button>
                    </div>
                </header>


                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full table-auto">
                        <thead className="bg-gray-200 text-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left">ID</th>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">Roles</th>
                                <th className="px-4 py-2 text-left">Permissions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}
                                onClick={() => navigate(`/users/${u.id}/roles`)}
                                 className="border-t last:border-b">
                                    <td className="px-4 py-3">{u.id}</td>
                                    <td className="px-4 py-3">{u.name}</td>
                                    <td className="px-4 py-3">{u.email}</td>
                                    <td className="px-4 py-3">{u.roles.join(', ')}</td>
                                    <td className="px-4 py-3">{u.permissions.join(', ')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
