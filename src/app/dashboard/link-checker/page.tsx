'use client';
import { useState, useEffect } from 'react';
import apiFetch from '@/utils/api'; // Import the new apiFetch utility

// Interfaces
interface Project {
  id: string;
  name: string;
}
interface RankResult {
  keyword: string;
  rank: number | null;
  status: 'pending' | 'checking' | 'done' | 'error';
  error?: string;
}

export default function LinkCheckerPage() {
  // State
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [results, setResults] = useState<RankResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project saving state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null); // State for project loading error
  
  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setProjectsError(null);
    try {
      const data = await apiFetch('/api/projects');
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      if (err instanceof Error) {
        setProjectsError(`Lỗi tải danh sách dự án: ${err.message}`);
      } else {
        setProjectsError("Đã xảy ra lỗi không xác định khi tải dự án.");
      }
    }
  };

  const handleCheckRanks = async () => {
    const keywords = keywordsInput.split('\n').filter(kw => kw.trim() !== '');
    if (!websiteUrl || keywords.length === 0) {
      setError('Vui lòng nhập Website URL và ít nhất một từ khóa.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults(keywords.map(kw => ({ keyword: kw, rank: null, status: 'checking' })));

    try {
      const data = await apiFetch('/api/rank-checker/check', { // Use apiFetch
        method: 'POST',
        body: JSON.stringify({ websiteUrl, keywords })
      });
      
      setResults(data.map((item: any) => ({
        keyword: item.keyword,
        rank: item.rank,
        status: item.error ? 'error' : 'done',
        error: item.error
      })));

    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToProject = async () => {
    if (!selectedProjectId) {
        alert("Vui lòng chọn một dự án để lưu.");
        return;
    }
    setIsSaving(true);
    try {
        const keywordsToSave = results.filter(r => r.status === 'done').map(r => r.keyword);
        
        for (const keyword of keywordsToSave) {
             await apiFetch(`/api/projects/${selectedProjectId}/keywords`, { // Use apiFetch
                method: 'POST',
                body: JSON.stringify({ keyword_text: keyword }),
            });
        }
        alert(`Đã lưu ${keywordsToSave.length} từ khóa vào dự án!`);

    } catch(err) {
        alert("Lỗi khi lưu từ khóa.");
    } finally {
        setIsSaving(false);
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kiểm tra Thứ hạng Từ khóa</h1>
        <p className="mt-2 text-sm text-gray-600">Nhập URL website và danh sách từ khóa (mỗi từ khóa một dòng) để kiểm tra vị trí trên Google (top 100).</p>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
                <label htmlFor="website-url" className="block text-sm font-medium text-gray-700">Website URL</label>
                <input
                    type="url"
                    id="website-url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
            </div>
            <div className="md:col-span-3">
                <label htmlFor="keywords-input" className="block text-sm font-medium text-gray-700">Danh sách từ khóa</label>
                <textarea
                    id="keywords-input"
                    rows={8}
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    placeholder="digital marketing&#10;seo tools&#10;content marketing"
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
            </div>
        </div>
        <div className="mt-6 text-right">
            <button
                onClick={handleCheckRanks}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
                {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra Thứ hạng'}
            </button>
        </div>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      
      {results.length > 0 && (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold">Kết quả</h2>
            
            {/* Save to project section */}
            <div className="p-4 my-4 bg-gray-50 rounded-md">
                <label htmlFor="project-select" className="block text-sm font-medium text-gray-700">Lưu kết quả vào dự án</label>
                {projectsError ? (
                  <p className="mt-1 text-sm text-red-600">{projectsError}</p>
                ) : (
                  <div className="flex items-center mt-1 space-x-3">
                      <select 
                          id="project-select"
                          value={selectedProjectId}
                          onChange={e => setSelectedProjectId(e.target.value)}
                          className="block w-full max-w-xs px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm"
                      >
                          <option value="" disabled>-- Chọn một dự án --</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <button 
                          onClick={handleSaveToProject}
                          disabled={isSaving || !selectedProjectId}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50"
                      >
                         {isSaving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                  </div>
                )}
                 <p className="mt-2 text-xs text-gray-500">Chỉ những từ khóa kiểm tra thành công mới được lưu. Bạn có thể tạo dự án mới tại trang "Theo dõi Dự án".</p>
            </div>

            {/* Results table */}
            <table className="min-w-full mt-4 divide-y divide-gray-300">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Từ khóa</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Thứ hạng</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Trạng thái</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((r, i) => (
                      <tr key={i}>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{r.keyword}</td>
                          <td className="px-3 py-4 text-sm text-gray-500">{r.rank || (r.status === 'done' ? 'Không có trong Top 100' : 'N/A')}</td>
                           <td className="px-3 py-4 text-sm text-gray-500">
                             {r.status === 'checking' && 'Đang kiểm tra...'}
                             {r.status === 'done' && 'Hoàn thành'}
                             {r.status === 'error' && `Lỗi: ${r.error}`}
                           </td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
