'use client';
import { useState, useEffect } from 'react';
import apiFetch from '@/utils/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: string | null;
  role_name: string;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
        await apiFetch(`/api/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role_id: newRoleId }),
        });
        // Refresh data to show the change
        fetchData();
    } catch (err) {
        if (err instanceof Error) alert(`Lỗi cập nhật vai trò: ${err.message}`);
    }
  };

  if (isLoading) return <div>Đang tải danh sách người dùng...</div>;
  if (error) return <div className="text-red-600">Lỗi: {error}</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Quản lý User</h1>
      <p className="mt-2 text-sm text-gray-600">Xem và quản lý vai trò của người dùng trong hệ thống.</p>
      
      <div className="mt-8 flow-root">
          <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Email</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tên đầy đủ</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vai trò</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ngày tạo</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map(user => (
                      <tr key={user.id}>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{user.email}</td>
                          <td className="px-3 py-4 text-sm text-gray-500">{user.full_name}</td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <select 
                                value={user.role_id || ''}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            >
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
}
