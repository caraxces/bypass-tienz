'use client';
import { useState } from 'react';

interface ResultGroup {
  [index: number]: string[];
}

export default function KeywordCheckerPage() {
  const [keywordsInput, setKeywordsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultGroups, setResultGroups] = useState<ResultGroup>([]);
  const [similarity, setSimilarity] = useState(60); // State for similarity threshold

  const handleAnalyze = async () => {
    const keywords = keywordsInput.split('\n').filter(kw => kw.trim() !== '');
    if (keywords.length < 2) {
      setError('Vui lòng nhập ít nhất 2 từ khóa để so sánh.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultGroups([]);

    try {
      const response = await fetch('/api/keyword-checker/find-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, threshold: similarity / 100 }), // Send threshold to backend
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Đã xảy ra lỗi khi phân tích.');
      }
      
      setResultGroups(data.keywordGroups);

    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Phân tích Từ khóa Tương tự</h1>
        <p className="mt-2 text-sm text-gray-600">
          Dán danh sách từ khóa của bạn vào đây (mỗi từ khóa một dòng). Công cụ sẽ phân tích và nhóm các từ khóa có kết quả tìm kiếm trên Google gần giống nhau, giúp bạn xác định các từ khóa có cùng ý định tìm kiếm.
        </p>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <label htmlFor="keywords-input" className="block text-sm font-medium text-gray-700">Danh sách từ khóa</label>
        <textarea
            id="keywords-input"
            rows={10}
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="digital marketing agency&#10;seo services company&#10;best seo agency"
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
        />
        <div className="mt-4">
            <label htmlFor="similarity-slider" className="block text-sm font-medium text-gray-700">
                Ngưỡng tương đồng: <span className="font-bold">{similarity}%</span>
            </label>
            <input
                id="similarity-slider"
                type="range"
                min="30"
                max="90"
                step="5"
                value={similarity}
                onChange={(e) => setSimilarity(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="mt-6 text-right">
            <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
                {isLoading ? 'Đang phân tích...' : 'Phân tích'}
            </button>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-600">{error}</p>}
      
      {resultGroups.length > 0 && (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Các nhóm từ khóa tương tự</h2>
            <div className="space-y-4">
                {resultGroups.map((group, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md">
                        <h3 className="font-semibold text-gray-800 mb-2">Nhóm {index + 1}</h3>
                        <div className="flex flex-wrap gap-2">
                            {group.map((keyword, kwIndex) => (
                                <span key={kwIndex} className="px-2 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full">
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
       { !isLoading && resultGroups.length === 0 && keywordsInput.split('\n').filter(kw => kw.trim() !== '').length > 1 &&
            <div className="p-6 bg-white rounded-lg shadow-md">
                 <p className="text-center text-gray-600">Không tìm thấy nhóm từ khóa nào có độ tương tự trên 60%.</p>
            </div>
       }
    </div>
  );
}
