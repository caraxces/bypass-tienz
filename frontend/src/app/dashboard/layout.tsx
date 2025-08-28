'use client'

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="w-auto">
        <Sidebar />
      </div>
      
      <div className="flex flex-col flex-1 animated-gradient">
        <Header />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white/50 backdrop-blur-lg p-6 rounded-2xl shadow-md">
                {children}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
