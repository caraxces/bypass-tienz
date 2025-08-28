'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import apiFetch from '@/utils/api';

export default function Header() {
    const router = useRouter();
    
    const handleLogout = async () => {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (error) {
            console.error('Failed to log out:', error);
            // Fallback for logout even if API fails
            router.push('/login');
        }
    };

    return (
        <header className="flex items-center justify-end h-20 px-6 md:px-10">
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout} 
                className="px-4 py-2 font-medium text-gray-700 bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-lg shadow-sm hover:bg-white text-fib-1"
            >
                Logout
            </motion.button>
        </header>
    );
}
