'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Header() {
    const router = useRouter();
    
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        router.push('/login');
    };

    return (
        <header className="flex items-center justify-end h-20 px-6 md:px-10 bg-gray-50">
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100"
            >
                Logout
            </motion.button>
        </header>
    );
}
