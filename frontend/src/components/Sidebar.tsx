'use client';

import Link from 'next/link';
import Image from 'next/image'; // Import Image component
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const Tools = [
  { name: 'Website Audit', href: '/dashboard/audit' },
  { name: 'Check vị trí link', href: '/dashboard/link-position-checker' },
  { name: 'Check thứ hạng link', href: '/dashboard/link-checker' },
  { name: 'Theo dõi Dự án', href: '/dashboard/projects' },
  { name: 'Check từ khóa chính', href: '/dashboard/keyword-checker' },
  { name: 'Danh sách Schema', href: '/dashboard/schemas' },
  { name: 'Danh sách Tag', href: '/dashboard/tags' },
  { name: 'Quản lý User', href: '/dashboard/users' },
  { name: 'Quản lý Role', href: '/dashboard/roles' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="flex flex-col h-full bg-white/70 backdrop-blur-lg shadow-lg rounded-2xl m-4"
    >
      <div className="flex items-center justify-center h-20">
        <Image 
          src="/favicon.ico" 
          alt="App Logo" 
          width={40} 
          height={40} 
          className="rounded-full"
        />
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {Tools.map((tool) => {
          const isActive = pathname === tool.href;
          return (
            <Link
              key={tool.name}
              href={tool.href}
              className="relative block"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="relative flex items-center px-4 py-3 font-medium text-gray-800 rounded-lg hover:bg-gray-200/50 transition-colors duration-200 text-fib-1"
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar_active_pill"
                    className="absolute inset-0 bg-indigo-500 rounded-lg"
                    style={{ zIndex: 10 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
                <span className={`relative z-20 ${isActive ? 'text-white' : ''}`}>
                  {tool.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto text-center text-xs text-gray-500">
        <p>tool by trucmt/caraxces 2025</p>
      </div>
    </motion.div>
  );
}
