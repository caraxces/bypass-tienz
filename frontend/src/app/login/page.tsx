'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiFetch from '@/utils/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            // Đăng nhập thành công, backend đã set cookie
            // Chuyển hướng đến dashboard
            router.push('/dashboard');

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                <h2 className="text-fib-2 font-bold text-center text-gray-900">
                    Đăng nhập vào tài khoản của bạn
                </h2>
                {error && (
                    <div className="p-3 text-red-700 bg-red-100 rounded-md text-fib-1">
                        {error}
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-none appearance-none rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-fib-1"
                                placeholder="Địa chỉ email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password"  className="sr-only">Mật khẩu</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-none appearance-none rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-fib-1"
                                placeholder="Mật khẩu"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative flex justify-center w-full px-4 py-2 font-medium text-white bg-indigo-600 border border-transparent rounded-md group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 text-fib-1"
                        >
                            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </div>
                </form>
                <div className="text-center text-fib-1">
                    <p>
                        Chưa có tài khoản?{' '}
                        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
