'use client';
import { useState } from 'react';
import apiFetch from '@/utils/api';

interface ExtractionResult {
  url: string;
  title: string;
  h1: string;
  metaDesc: string;
  canonical: string;
}

export default function CustomXPathExtractor() {
  const [url, setUrl] = useState('');
  const [xpathExpression, setXpathExpression] = useState('//loc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractionResult[]>([]);

  const handleExtract = async () => {
    if (!url || !xpathExpression) {
      setError('Vui lòng nhập đầy đủ URL và biểu thức XPath.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await apiFetch('/api/tools/import-xml', {
        method: 'POST',
        body: JSON.stringify({ url, xpathExpression }),
      });
      setResults(data.results);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="extract-url" className="block text-sm font-medium text-gray-700">URL cần trích xuất</label>
            <input
              type="url"
              id="extract-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="xpath-expression" className="block text-sm font-medium text-gray-700">Biểu thức XPath</label>
            <input
              type="text"
              id="xpath-expression"
              value={xpathExpression}
              onChange={e => setXpathExpression(e.target.value)}
              className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm sm:text-sm"
            />
          </div>
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={handleExtract}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? 'Đang trích xuất...' : 'Trích xuất'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      
      {results.length > 0 && (
        <div className="p-6 mt-6 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold">Kết quả ({results.length})</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">H1</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Desc</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canonical</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 break-all">{item.url}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.h1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.metaDesc}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 break-all">{item.canonical}</td>
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
