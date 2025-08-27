'use client';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();

    const handleLogout = () => {
        // Clear the authentication token from storage
        localStorage.removeItem('authToken');
        // Redirect to the login page
        router.push('/login');
    };

    return (
        <header className="flex items-center justify-between p-4 bg-white border-b">
            <div className="flex items-center">
                {/* Search bar can go here if needed */}
            </div>
            <div className="flex items-center space-x-4">
                {/* User info can go here */}
                <button onClick={handleLogout} className="text-gray-600 hover:text-gray-800">
                    Logout
                </button>
            </div>
        </header>
    );
}
