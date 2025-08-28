'use client';
import { useState, useEffect, useRef } from 'react';
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
    last_checked: string;
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
  const [editingRank, setEditingRank] = useState<{ [key: string]: boolean }>({});
  const [newRank, setNewRank] = useState<{ [key: string]: string }>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/projects/${projectId}/keywords`);
      if (data && Array.isArray(data.keywords)) {
        setProject(data.project);
        setKeywords(data.keywords);
      } else {
        setKeywords([]); // Đảm bảo keywords luôn là một mảng
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await apiFetch(`/api/projects/${projectId}/keywords`, {
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

  const handleRankClick = (keywordId: string, currentRank: number | null) => {
      setEditingRank(prev => ({ ...prev, [keywordId]: true }));
      setNewRank(prev => ({ ...prev, [keywordId]: currentRank?.toString() || '' }));
  };

  const handleRankChange = (keywordId: string, value: string) => {
      setNewRank(prev => ({ ...prev, [keywordId]: value }));
  };

  const handleManualRankUpdate = async (keywordId: string) => {
      const rankValue = newRank[keywordId];
      if (rankValue === null || rankValue === undefined) {
          setEditingRank(prev => ({ ...prev, [keywordId]: false }));
          return;
      }

      const rank = parseInt(rankValue, 10);
      if (isNaN(rank)) {
          setError('Vui lòng nhập một số hợp lệ.');
          return;
      }

      try {
          const data = await apiFetch(`/api/keywords/${keywordId}/manual-rank`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rank }),
          });

          setKeywords(prevKeywords => 
              prevKeywords.map(kw => kw.id === keywordId ? { ...kw, latest_rank: data.keyword.latest_rank, last_checked: data.keyword.last_checked } : kw)
          );
          setError(null);
      } catch (error) {
          console.error('Lỗi khi cập nhật thứ hạng thủ công:', error);
          setError('Không thể cập nhật thứ hạng.');
      } finally {
          setEditingRank(prev => ({ ...prev, [keywordId]: false }));
      }
  };

    const handleTriggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setIsImporting(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const data = await apiFetch(`/api/projects/${projectId}/keywords/import`, {
                method: 'POST',
                body: formData,
            }, true); // `true` để bỏ qua content-type header

            alert(data.message); // Hiển thị thông báo thành công
            fetchProjectData(); // Tải lại dữ liệu

        } catch (error) {
            console.error('Lỗi khi nhập CSV:', error);
            setError((error as Error).message || 'Không thể nhập file CSV.');
        } finally {
            setIsImporting(false);
            // Reset file input để có thể chọn lại cùng một file
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };


    const handleExportCsv = async () => {
        try {
            const response = await apiFetch(`/api/projects/${projectId}/keywords/export`, {
                method: 'GET',
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể xuất CSV.');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `keywords-${project?.name || projectId}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Lỗi khi xuất CSV:', error);
            setError((error as Error).message);
        }
    };


  const handleCheckRank = async (keywordId: string) => {
    setKeywords(prevKeywords => 
      prevKeywords.map(kw => kw.id === keywordId ? { ...kw, isChecking: true } : kw)
    );
    try {
        const data = await apiFetch(`/api/keywords/${keywordId}/check`, { method: 'POST' });
        
        // Cập nhật keyword với dữ liệu mới nhất từ backend
        setKeywords(prevKeywords => 
          prevKeywords.map(kw => 
            kw.id === keywordId 
              ? { ...kw, latest_rank: data.keyword.position, isChecking: false } 
              : kw
          )
        );

    } catch(err) {
        alert('Failed to check rank.');
        setKeywords(prevKeywords => 
          prevKeywords.map(kw => kw.id === keywordId ? { ...kw, isChecking: false } : kw)
        );
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
      <Link href="/dashboard/projects" className="hover:underline text-fib-1">&larr; Quay lại</Link>
      <div className="sm:flex sm:items-center mt-2">
        <div className="sm:flex-auto">
          <h1 className="text-fib-3 font-bold text-gray-900">{project?.name || 'Chi tiết Dự án'}</h1>
          {/* <p>{project?.name}</p> */}
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 text-fib-1">
                Thêm từ khóa
            </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="mt-8 flow-root">
          <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left font-semibold text-gray-900 sm:pl-6 text-fib-1">Từ khóa</th>
                      <th className="px-3 py-3.5 text-left font-semibold text-gray-900 text-fib-1">Thứ hạng (Top 100)</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Hành động</span></th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                  {keywords.map(kw => (
                      <tr key={kw.id}>
                          <td className="py-4 pl-4 pr-3 font-medium text-gray-900 sm:pl-6 text-fib-1">{kw.keyword_text}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-fib-1">
                              {editingRank[kw.id] ? (
                                  <input
                                      type="number"
                                      value={newRank[kw.id]}
                                      onChange={(e) => handleRankChange(kw.id, e.target.value)}
                                      onBlur={() => handleManualRankUpdate(kw.id)}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              handleManualRankUpdate(kw.id);
                                          } else if (e.key === 'Escape') {
                                              setEditingRank(prev => ({ ...prev, [kw.id]: false }));
                                          }
                                      }}
                                      className="w-20 p-1 border border-gray-300 rounded-md"
                                      autoFocus
                                  />
                              ) : (
                                  <span onClick={() => handleRankClick(kw.id, kw.latest_rank)} className="cursor-pointer hover:underline">
                                      {kw.latest_rank !== null ? kw.latest_rank : 'Chưa có'}
                                  </span>
                              )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-fib-1">
                              {new Date(kw.last_checked).toLocaleString()}
                          </td>
                          <td className="relative py-4 pl-3 pr-4 text-right font-medium sm:pr-6 text-fib-1">
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
