'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import apiFetch from '@/utils/api'; // Import the new apiFetch utility

interface Project {
  id: string;
  name: string;
  website_url: string;
  created_at: string;
  slug: string;
  language: string;
  country: string;
  device: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    website_url: '',
    slug: '',
    language: 'vi',
    country: 'vn',
    device: 'desktop'
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/projects'); // Use apiFetch
      setProjects(data);
    } catch (err) {
      if(err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.website_url) {
      alert('Vui lòng nhập đầy đủ Tên dự án và URL Website.');
      return;
    }

    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProject),
      });

      // Reset form and refresh list
      setNewProject({
        name: '',
        website_url: '',
        slug: '',
        language: 'vi',
        country: 'vn',
        device: 'desktop'
      });
      setIsModalOpen(false);
      fetchProjects(); // Refresh the project list
    } catch (err) {
      if (err instanceof Error) alert(`Lỗi: ${err.message}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewProject(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Dự án</h1>
          <p className="mt-2 text-sm text-gray-700">
            Một dự án tương ứng với một website bạn muốn theo dõi từ khóa.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            Tạo dự án mới
          </button>
        </div>
      </div>
      
      {/* Project List Table */}
      <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Tên dự án</th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Website</th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ngôn ngữ</th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Quốc gia</th>
                                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Thiết bị</th>
                                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                              {isLoading ? (
                                  <tr><td colSpan={6} className="py-4 text-center">Đang tải...</td></tr>
                              ) : projects.map((project) => (
                                  <tr key={project.id}>
                                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{project.name}</td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{project.website_url}</td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{project.language}</td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{project.country}</td>
                                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{project.device}</td>
                                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                          <Link href={`/dashboard/projects/${project.id}`} className="text-indigo-600 hover:text-indigo-900">
                                              Xem chi tiết<span className="sr-only">, {project.name}</span>
                                          </Link>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 bg-gray-500 bg-opacity-75" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreateProject}>
                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">Tạo dự án mới</h3>
                <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên dự án</label>
                    <input type="text" id="name" value={newProject.name} onChange={handleInputChange} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="website_url" className="block text-sm font-medium text-gray-700">URL Website</label>
                    <input type="url" id="website_url" value={newProject.website_url} onChange={handleInputChange} required placeholder="https://example.com" className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                  </div>
                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Slug (Tùy chọn)</label>
                    <input type="text" id="slug" value={newProject.slug} onChange={handleInputChange} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                  </div>
                   <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">Ngôn ngữ</label>
                    <input type="text" id="language" value={newProject.language} onChange={handleInputChange} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">Quốc gia</label>
                    <input type="text" id="country" value={newProject.country} onChange={handleInputChange} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                  </div>
                  <div>
                    <label htmlFor="device" className="block text-sm font-medium text-gray-700">Thiết bị</label>
                    <input type="text" id="device" value={newProject.device} onChange={handleInputChange} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                  <button type="submit" className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Tạo</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Hủy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
