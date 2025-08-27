'use client';
import { useState, useEffect } from 'react';
import apiFetch from '@/utils/api';
import Link from 'next/link';

interface SchemaTemplate {
  id: string;
  name: string;
}

interface ExtractionResult {
  headers: string[];
  data: Record<string, string>[];
}

export default function SchemasPage() {
  const [templates, setTemplates] = useState<SchemaTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [url, setUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/api/schemas');
      setTemplates(data);
    } catch (err) {
      if(err instanceof Error) setError(`Lỗi tải templates: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa template này không?')) {
        try {
            await apiFetch(`/api/schemas/${templateId}`, { method: 'DELETE' });
            fetchTemplates(); // Refresh the list
        } catch (err) {
            if(err instanceof Error) alert(`Lỗi khi xóa: ${err.message}`);
        }
    }
  };
  
  const handleExecute = async () => {
    if (!url || !selectedTemplateId) {
        setError("Vui lòng chọn template và nhập URL.");
        return;
    }
    setIsExecuting(true);
    setError(null);
    setResult(null);
    try {
        const data = await apiFetch('/api/schemas/execute', {
            method: 'POST',
            body: JSON.stringify({ url, templateId: selectedTemplateId })
        });
        setResult(data);
    } catch(err) {
        if(err instanceof Error) setError(err.message);
    } finally {
        setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
            <h1 className="text-3xl font-bold text-gray-900">Trích xuất dữ liệu Schema</h1>
            <p className="mt-2 text-sm text-gray-600">Chọn một template, nhập URL và chạy để trích xuất dữ liệu có cấu trúc.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link href="/dashboard/schemas/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
                Tạo Template Mới
            </Link>
        </div>
      </div>

      {/* Danh sách templates */}
       <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold">Templates của bạn</h2>
        <div className="mt-4 space-y-2">
            {templates.map(template => (
                <div key={template.id} className="flex justify-between items-center p-3 border rounded-md">
                    <span className="font-medium text-gray-800">{template.name}</span>
                    <div className="space-x-3">
                        <Link href={`/dashboard/schemas/${template.id}/edit`} className="text-sm text-indigo-600 hover:underline">Sửa</Link>
                        <button onClick={() => handleDelete(template.id)} className="text-sm text-red-600 hover:underline">Xóa</button>
                    </div>
                </div>
            ))}
            {templates.length === 0 && !isLoading && (
                <p className="text-center text-gray-500 py-4">Bạn chưa có template nào. Hãy tạo một cái mới!</p>
            )}
        </div>
      </div>


      {/* Vùng chạy tool */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
                <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">Chọn Template</label>
                <select id="template-select" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm">
                    <option value="" disabled>-- Chọn template --</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="url-input" className="block text-sm font-medium text-gray-700">URL cần trích xuất</label>
                <input type="url" id="url-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
            </div>
        </div>
        <div className="mt-6 text-right">
          <button onClick={handleExecute} disabled={isExecuting} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isExecuting ? 'Đang chạy...' : 'Chạy Tool'}
          </button>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Bảng kết quả */}
      {result && (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">Kết quả ({result.data.length} dòng)</h3>
            <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {result.headers.map(header => <th key={header} className="px-4 py-2 font-semibold text-left text-gray-600">{header}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {result.data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {result.headers.map(header => <td key={header} className="px-4 py-2 text-gray-700 whitespace-nowrap">{row[header]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
}
