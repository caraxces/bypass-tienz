'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiFetch from '@/utils/api'; // Import the new apiFetch utility

interface Project {
  id: string;
  name: string;
  website_url: string;
}

interface Keyword {
    id: string;
    keyword_text: string;
    latest_rank: number | null;
    isChecking?: boolean;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    setIsLoading(true);
    try {
      // API to get project details to be created later, for now we just get keywords
      // const projectData = await apiFetch(`/api/projects/${projectId}`);
      // setProject(projectData);
      
      const keywordsData = await apiFetch(`/api/projects/${projectId}/keywords`); // Use apiFetch
      setKeywords(keywordsData);

    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await apiFetch(`/api/projects/${projectId}/keywords`, { // Use apiFetch
            method: 'POST',
            body: JSON.stringify({ keyword_text: newKeyword }),
        });
        await fetchProjectData(); // Refresh list
        setIsModalOpen(false);
        setNewKeyword('');
    } catch (err) {
        if(err instanceof Error) alert(err.message);
    }
  };

  const handleCheckRank = async (keywordId: string) => {
    setKeywords(keywords.map(kw => kw.id === keywordId ? { ...kw, isChecking: true } : kw));
    try {
        const data = await apiFetch(`/api/keywords/${keywordId}/check`, { method: 'POST' }); // Use apiFetch
        
        // Update rank in UI
        setKeywords(keywords.map(kw => kw.id === keywordId ? { ...kw, latest_rank: data.rank, isChecking: false } : kw));

    } catch(err) {
        alert('Failed to check rank.');
        setKeywords(keywords.map(kw => kw.id === keywordId ? { ...kw, isChecking: false } : kw));
    }
  };
  
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Đang tải chi tiết dự án...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="space-y-2">
          <button 
            onClick={() => {
              setError(null);
              fetchProjectData();
            }}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Thử lại
          </button>
          <Link 
            href="/dashboard/projects" 
            className="block w-full text-center text-indigo-600 hover:text-indigo-800"
          >
            Quay lại danh sách dự án
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Link href="/dashboard/projects" className="text-sm text-indigo-600 hover:underline">&larr; Quay lại</Link>
      <div className="sm:flex sm:items-center mt-2">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết Dự án</h1>
          {/* <p>{project?.name}</p> */}
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                Thêm từ khóa
            </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="mt-8 flow-root">
          <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Từ khóa</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Thứ hạng (Top 100)</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Hành động</span></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                  {keywords.map(kw => (
                      <tr key={kw.id}>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{kw.keyword_text}</td>
                          <td className="px-3 py-4 text-sm text-gray-500">{kw.latest_rank || 'Chưa có'}</td>
                          <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button onClick={() => handleCheckRank(kw.id)} disabled={kw.isChecking} className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50">
                                  {kw.isChecking ? 'Đang check...' : 'Check lại'}
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* Add Keyword Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-10 bg-gray-500 bg-opacity-75">
              <div className="flex items-center justify-center min-h-screen">
                  <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
                      <form onSubmit={handleAddKeyword}>
                          <h3 className="text-lg font-medium text-gray-900">Thêm từ khóa mới</h3>
                          <div className="mt-4">
                              <label htmlFor="keyword-text" className="block text-sm font-medium text-gray-700">Nhập từ khóa</label>
                              <input type="text" id="keyword-text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                          </div>
                          <div className="mt-6 flex justify-end space-x-3">
                              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Thêm</button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
