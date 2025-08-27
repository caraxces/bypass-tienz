'use client';
import { useState } from 'react';
import apiFetch from '@/utils/api';

interface PositionResult {
  found: boolean;
  position?: number;
  totalLinks?: number;
  message?: string;
  image?: string; // To hold the base64 image string
}

export default function LinkPositionCheckerPage() {
  const [pageUrl, setPageUrl] = useState('');
  const [targetLink, setTargetLink] = useState('');
  const [xpathExpression, setXpathExpression] = useState('//body');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PositionResult | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const handleCheckPosition = async () => {
    if (!pageUrl || !targetLink || !xpathExpression) {
      setError('Vui lòng nhập đầy đủ cả 3 trường thông tin.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setScreenshot(null);

    try {
      const data = await apiFetch('/api/link-position-checker/check', {
        method: 'POST',
        body: JSON.stringify({ pageUrl, targetLink, xpathExpression }),
      });
      setResult(data);
      if (data.image) {
        setScreenshot(data.image);
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
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
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="page-url" className="block text-sm font-medium text-gray-700">URL của trang (Page URL)</label>
            <input type="url" id="page-url" value={pageUrl} onChange={e => setPageUrl(e.target.value)} placeholder="https://example.com/page-to-check" className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label htmlFor="target-link" className="block text-sm font-medium text-gray-700">Link cần tìm (Target Link)</label>
            <input type="url" id="target-link" value={targetLink} onChange={e => setTargetLink(e.target.value)} placeholder="https://example.com/link-to-find" className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label htmlFor="xpath" className="block text-sm font-medium text-gray-700">Biểu thức XPath của vùng nội dung</label>
            <input type="text" id="xpath" value={xpathExpression} onChange={e => setXpathExpression(e.target.value)} className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
        </div>
        <div className="mt-6 text-right">
          <button onClick={handleCheckPosition} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
          </button>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className={`p-6 rounded-lg shadow-md ${result.found ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <h3 className="text-lg font-semibold">Kết quả</h3>
          {result.found ? (
            <p className="mt-2 text-green-800">
              <span className="font-bold">Tìm thấy!</span> Link nằm ở vị trí thứ <span className="font-bold">{result.position}</span> trong tổng số <span className="font-bold">{result.totalLinks}</span> link trong vùng nội dung.
            </p>
          ) : (
            <p className="mt-2 text-yellow-800">
              <span className="font-bold">Không tìm thấy.</span> {result.message}
            </p>
          )}
        </div>
      )}

      {screenshot && (
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
