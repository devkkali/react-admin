import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authApi, fetchCsrfToken } from '../api'; // Import authApi and fetchCsrfToken

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For loading state
    const navigate = useNavigate();

    // Optional: Fetch CSRF token when component mounts,
    // or ensure it's called at app initialization (e.g., in App.js)
    useEffect(() => {
        fetchCsrfToken(); // Ensures CSRF cookie is set before any potential form submission
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 1. Ensure CSRF cookie is fresh (optional if done in useEffect or globally)
            // await fetchCsrfToken();

            // 2. Attempt to login using the authApi instance
            // Laravel's /login route typically doesn't return data directly,
            // it sets cookies and returns a 200 or 204 on success.
            await authApi.post('/login', { email, password });

            // 3. Fetch user information to confirm login and get roles
            // This uses the 'api' instance which might have a tenant-specific or /api prefix
            const { data: me } = await api.get('/user'); // Or '/api/user' if your backend route is such

            // console.log('User data after login:', me);

            // IMPORTANT: If you use a global state (Context, Redux, Zustand),
            // dispatch an action here to set the user data.
            // e.g., setUser(me);

            if (me.roles && me.roles.includes('super-admin')) {
                navigate('/dashboard');
            } else if (me.roles && me.roles.includes('pm-manager')) {
                navigate('/pm-dashboard');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.response) {
                // Handle specific errors from Laravel validation (422) or auth failure (401, 419)
                if (err.response.status === 422) {
                    // Laravel validation errors
                    const validationErrors = err.response.data.errors;
                    const firstError = Object.values(validationErrors)[0];
                    setError(Array.isArray(firstError) ? firstError[0] : 'Validation failed.');
                } else if (err.response.status === 419) {
                    setError('Session expired or CSRF token mismatch. Please refresh and try again.');
                    // Optionally, try to fetch CSRF token again and suggest retry
                    fetchCsrfToken();
                } else {
                    setError(err.response.data?.message || 'Login failed. Please check your credentials.');
                }
            } else {
                setError('Login failed. An unexpected error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    Welcome Back
                </h2>

                {error && (
                    <div className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="email" className="block text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}