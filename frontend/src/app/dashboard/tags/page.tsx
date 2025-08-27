'use client';
import { useState, useEffect } from 'react';
import apiFetch from '@/utils/api';
import TagModal from '@/components/TagModal'; // Import component mới

interface Project {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
}

export default function TagsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  useEffect(() => {
    apiFetch('/api/projects').then(setProjects);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTags();
    }
  }, [selectedProjectId]);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/tags?projectId=${selectedProjectId}`);
      setTags(data);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (tag: Tag | null) => {
    setEditingTag(tag);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingTag(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (tagId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa tag này?')) {
        try {
            await apiFetch(`/api/tags/${tagId}`, { method: 'DELETE' });
            fetchTags();
        } catch (err) {
            if (err instanceof Error) alert(`Lỗi: ${err.message}`);
        }
    }
  };

  const handleToggleActive = async (tag: Tag) => {
    try {
        await apiFetch(`/api/tags/${tag.id}`, {
            method: 'PUT',
            body: JSON.stringify({ is_active: !tag.is_active }),
        });
        fetchTags(); // Refresh
    } catch (err) {
        if (err instanceof Error) alert(`Lỗi: ${err.message}`);
    }
  };
  
  const scriptUrl = selectedProjectId ? `${window.location.origin}/api/tags/public/${selectedProjectId}.js` : '';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Tag</h1>
        <p className="mt-2 text-sm text-gray-600">Quản lý các đoạn mã script để chèn vào website của bạn, tương tự Google Tag Manager.</p>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <label htmlFor="project-select" className="block text-sm font-medium text-gray-700">Chọn Dự án để quản lý Tag</label>
        <select
          id="project-select"
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="block w-full max-w-md px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm"
        >
          <option value="" disabled>-- Chọn một dự án --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      
      {selectedProjectId && (
        <>
            <div className="p-6 bg-blue-50 rounded-lg shadow-md">
                <h3 className="font-semibold text-blue-800">Mã cài đặt</h3>
                <p className="mt-2 text-sm text-blue-700">Chèn đoạn mã này vào trước thẻ `&lt;/head&gt;` trên tất cả các trang của website thuộc dự án này.</p>
                <code className="block p-3 mt-2 font-mono text-sm text-gray-800 bg-gray-100 rounded-md break-all">
                    &lt;script src="{scriptUrl}" async defer&gt;&lt;/script&gt;
                </code>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h2 className="text-xl font-semibold">Danh sách Tags</h2>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <button onClick={() => handleOpenModal(null)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                           + Thêm Tag
                        </button>
                    </div>
                </div>
                
                <div className="mt-4 space-y-3">
                    {tags.map(tag => (
                        <div key={tag.id} className="flex justify-between items-center p-4 border rounded-md">
                            <div>
                                <p className="font-medium text-gray-900">{tag.name}</p>
                                <p className="text-xs text-gray-500 font-mono">{tag.content.substring(0, 50)}...</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button onClick={() => handleOpenModal(tag)} className="text-sm text-indigo-600 hover:underline">Sửa</button>
                                <button onClick={() => handleDelete(tag.id)} className="text-sm text-red-600 hover:underline">Xóa</button>
                                <div onClick={() => handleToggleActive(tag)} className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors ${tag.is_active ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${tag.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && <p>Đang tải tags...</p>}
                    {!isLoading && tags.length === 0 && <p className="text-center text-gray-500 py-4">Chưa có tag nào cho dự án này.</p>}
                </div>
            </div>
            
            <TagModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={fetchTags}
                projectId={selectedProjectId}
                tag={editingTag}
            />
        </>
      )}
    </div>
  );
}
