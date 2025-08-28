'use client';
import { useState } from 'react';
import apiFetch from '@/utils/api';

// Type for single link check result
interface PositionResult {
  found: boolean;
  position?: number;
  totalLinks?: number;
  message?: string;
  image?: string; 
}

// Type for batch check results
interface BatchResultItem {
  url: string;
  found: boolean;
  position: number;
  totalLinks: number;
  error?: string;
}

type CheckMode = 'single' | 'batch';

export default function LinkPositionCheckerPage() {
  const [pageUrl, setPageUrl] = useState('');
  const [targetLink, setTargetLink] = useState('');
  const [xpathExpression, setXpathExpression] = useState('//body');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for results
  const [singleResult, setSingleResult] = useState<PositionResult | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResultItem[]>([]);
  
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [mode, setMode] = useState<CheckMode>('single');

  const handleCheckPosition = async () => {
    if (!pageUrl || !targetLink || !xpathExpression) {
      setError('Vui lòng nhập đầy đủ cả 3 trường thông tin.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSingleResult(null);
    setBatchResults([]);
    setScreenshot(null);

    try {
      const data = await apiFetch('/api/link-position-checker/check', {
        method: 'POST',
        body: JSON.stringify({ pageUrl, targetLink, xpathExpression, mode }),
      });

      if (mode === 'single') {
        setSingleResult(data);
        if (data.image) {
          setScreenshot(data.image);
        }
      } else {
        setBatchResults(data.results || []);
        if (data.message) {
           setError(data.message);
        }
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderResults = () => {
    if (mode === 'single' && singleResult) {
      return (
        <div className={`p-6 rounded-lg shadow-md ${singleResult.found ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <h3 className="text-lg font-semibold">Kết quả</h3>
          {singleResult.found ? (
            <p className="mt-2 text-green-800">
              <span className="font-bold">Tìm thấy!</span> Link nằm ở vị trí thứ <span className="font-bold">{singleResult.position}</span> trong tổng số <span className="font-bold">{singleResult.totalLinks}</span> link trong vùng nội dung.
            </p>
          ) : (
            <p className="mt-2 text-yellow-800">
              <span className="font-bold">Không tìm thấy.</span> {singleResult.message}
            </p>
          )}
        </div>
      );
    }

    if (mode === 'batch' && batchResults.length > 0) {
      return (
        <div className="p-6 mt-6 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold">Kết quả ({batchResults.length})</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL Đã Kiểm Tra</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vị Trí / Lỗi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số Link</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batchResults.map((item) => (
                  <tr key={item.url} className={item.found ? 'bg-green-50' : item.error ? 'bg-red-50' : 'bg-yellow-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 break-all">{item.url}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.found ? <span className="text-green-700">Tìm thấy</span> : <span className="text-yellow-700">Không tìm thấy</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.error ? <span className="text-red-600">{item.error}</span> : item.position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalLinks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kiểm tra Vị trí Link</h1>
        <p className="mt-2 text-sm text-gray-600">
          Công cụ này giúp bạn xác định một `targetLink` có tồn tại trong một vùng nội dung (xác định bằng XPath) trên một `pageUrl` cụ thể hay không.
        </p>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        {/* Mode switcher */}
        <div className="flex mb-6 border border-gray-200 rounded-md p-1 bg-gray-100">
            <button
                onClick={() => setMode('single')}
                className={`w-1/2 py-2 px-4 text-sm font-medium rounded-md transition-colors ${mode === 'single' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
            >
                Kiểm tra một trang
            </button>
            <button
                onClick={() => setMode('batch')}
                className={`w-1/2 py-2 px-4 text-sm font-medium rounded-md transition-colors ${mode === 'batch' ? 'bg-white shadow text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
            >
                Kiểm tra hàng loạt (từ Sitemap)
            </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="page-url" className="block text-sm font-medium text-gray-700">
              {mode === 'single' ? 'URL của trang (Page URL)' : 'URL của Sitemap hoặc trang danh sách'}
            </label>
            <input type="url" id="page-url" value={pageUrl} onChange={e => setPageUrl(e.target.value)} placeholder={mode === 'single' ? 'https://example.com/page-to-check' : 'https://example.com/sitemap.xml'} className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label htmlFor="target-link" className="block text-sm font-medium text-gray-700">Link cần tìm (Target Link)</label>
            <input type="url" id="target-link" value={targetLink} onChange={e => setTargetLink(e.target.value)} placeholder="https://example.com/link-to-find" className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label htmlFor="xpath" className="block text-sm font-medium text-gray-700">
              {mode === 'single' ? 'Biểu thức XPath của vùng nội dung' : 'Biểu thức XPath để lấy URL'}
            </label>
            <input type="text" id="xpath" value={xpathExpression} onChange={e => setXpathExpression(e.target.value)} className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
        </div>
        <div className="mt-6 text-right">
          <button onClick={handleCheckPosition} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
          </button>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-600 p-4 bg-red-50 rounded-md">{error}</p>}

      {renderResults()}

      {mode === 'single' && screenshot && (
        <div className="p-6 mt-8 bg-white rounded-lg shadow-md">
           <h3 className="text-lg font-semibold">Ảnh chụp vùng nội dung được chọn</h3>
           <div className="mt-4 overflow-auto border border-gray-300 rounded-md">
            <img 
              src={`data:image/png;base64,${screenshot}`} 
              alt="Ảnh chụp màn hình của vùng nội dung được chọn bởi XPath" 
              className="max-w-full h-auto"
            />
           </div>
        </div>
      )}
    </div>
  );
}
