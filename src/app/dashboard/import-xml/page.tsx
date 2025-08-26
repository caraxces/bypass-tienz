'use client';

import { useState } from 'react';

const SEO_TABS = {
  'Sitemap URLs': { xpath: '//loc/text()', description: 'Trích xuất tất cả URL từ thẻ <loc> trong sitemap.' },
  'Title': { xpath: '//title/text()', description: 'Trích xuất nội dung của thẻ <title>.' },
  'Meta Description': { xpath: "//meta[@name='description']/@content", description: 'Trích xuất nội dung của thẻ meta description.' },
  'H1 Tags': { xpath: '//h1/text()', description: 'Trích xuất nội dung của tất cả các thẻ <h1>.' },
  'All Links': { xpath: '//a/@href', description: 'Trích xuất thuộc tính href từ tất cả các thẻ <a>.' },
};

type TabName = keyof typeof SEO_TABS;

export default function PageAnalyzer() {
  const [url, setUrl] = useState('https://www.tienziven.com/sitemap.xml');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<TabName>('Sitemap URLs');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleFetchAndAnalyze = async (tabName: TabName) => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    setCurrentTab(tabName);

    try {
      const xpathExpression = SEO_TABS[tabName].xpath;
      const response = await fetch('http://localhost:3001/api/tools/import-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, xpathExpression }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra.');
      }
      
      setResults(data.results || []);
      if (!hasAnalyzed) setHasAnalyzed(true);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const TabButton = ({ tabName }: { tabName: TabName }) => (
    <button
      onClick={() => handleFetchAndAnalyze(tabName)}
      disabled={isLoading || !url}
      className={`px-4 py-2 text-sm font-medium border-b-2 ${
        currentTab === tabName
          ? 'border-indigo-500 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } disabled:opacity-50`}
    >
      {tabName}
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Công cụ Phân tích Trang</h1>
      <p className="mt-1 text-gray-600">
        Nhập một URL để tải nội dung, sau đó chọn các tab bên dưới để trích xuất thông tin SEO quan trọng.
      </p>

      <div className="mt-6">
        <label htmlFor="xml-url" className="block text-sm font-medium text-gray-700">
          Nhập URL để phân tích
        </label>
        <div className="flex mt-1 space-x-2">
           <input
            type="url"
            id="xml-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="https://example.com"
          />
           <button
            onClick={() => handleFetchAndAnalyze(currentTab)}
            disabled={isLoading || !url}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? 'Đang tải...' : 'Phân tích'}
          </button>
        </div>
      </div>
      
      {hasAnalyzed && (
        <div className="mt-6 border-b border-gray-200">
          <nav className="flex -mb-px space-x-6" aria-label="Tabs">
            {(Object.keys(SEO_TABS) as TabName[]).map((tabName) => (
              <TabButton key={tabName} tabName={tabName} />
            ))}
          </nav>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <p>Đang tải dữ liệu...</p>
        ) : error ? (
           <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded-md">
            <h3 className="font-bold">Lỗi!</h3>
            <p>{error}</p>
          </div>
        ) : hasAnalyzed && (
          <div>
            <h2 className="text-xl font-semibold">Kết quả cho "{currentTab}" ({results.length}):</h2>
            <p className="mt-1 text-sm text-gray-500">{SEO_TABS[currentTab].description}</p>
            <textarea
              readOnly
              className="w-full h-64 p-2 mt-2 font-mono text-sm bg-gray-100 border border-gray-300 rounded-md"
              value={results.length > 0 ? results.join('\\n') : 'Không tìm thấy kết quả.'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
