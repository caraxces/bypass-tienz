'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// You can find icons at https://heroicons.com/
const Tools = [
  { name: 'Website Audit', href: '/dashboard/audit', icon: '🔬' },
  { name: 'Check vị trí link', href: '/dashboard/link-position-checker', icon: '📍' }, // Changed href and icon
  { name: 'Check thứ hạng link', href: '/dashboard/link-checker', icon: '🔗' }, // Renamed
  { name: 'Theo dõi Dự án', href: '/dashboard/projects', icon: '📂' },
  { name: 'Check từ khóa chính', href: '/dashboard/keyword-checker', icon: '🔍' },
  { name: 'Danh sách Schema', href: '/dashboard/schemas', icon: '📝' },
  { name: 'Danh sách Tag', href: '/dashboard/tags', icon: '🔖' },
  { name: 'Quản lý User', href: '/dashboard/users', icon: '👥' },
  { name: 'Quản lý Role', href: '/dashboard/roles', icon: '🛡️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white border-r">
      <div className="flex items-center justify-center h-16 border-b">
        <h1 className="text-xl font-bold">Tienziven Bypass</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {Tools.map((tool) => (
          <Link
            key={tool.name}
            href={tool.href}
            className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname === tool.href
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="mr-3">{tool.icon}</span>
            {tool.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
