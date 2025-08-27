'use client';

import Link from 'next/link';
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
    <div className="flex flex-col w-64 bg-gray-50 border-r border-gray-200">
      <div className="flex items-center justify-center h-20 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 tracking-wider">TienZiven</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {Tools.map((tool) => {
          const isActive = pathname === tool.href;
          return (
            <Link
              key={tool.name}
              href={tool.href}
              className="relative flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
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
              <span className="relative" style={{ zIndex: 20 }}>
                {tool.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
