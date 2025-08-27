'use client';
import { useState, useEffect, useMemo } from 'react';
import AuditResults from '@/components/AuditResults';
import CustomXPathExtractor from '@/components/CustomXPathExtractor'; // Import component mới
import dynamic from 'next/dynamic';
import apiFetch from '@/utils/api';

// Dynamically import the visualizer to avoid SSR issues
const SiteVisualizer = dynamic(() => import('@/components/SiteVisualizer'), { ssr: false });

interface CrawledPage {
  id: number;
  url: string;
  status_code: number;
  title: string;
  meta_description: string;
  h1: string;
  word_count: number;
  found_links: string[];
}

interface CrawlHistoryItem {
  id: string;
  start_url: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  pages_crawled: number;
}

const XPATH_FILTERS = {
  'Tất cả trang': (page: CrawledPage) => true,
  'Trang lỗi (4xx)': (page: CrawledPage) => page.status_code >= 400 && page.status_code < 500,
  'Lỗi Server (5xx)': (page: CrawledPage) => page.status_code >= 500,
  'Thiếu Title': (page: CrawledPage) => !page.title,
  'Thiếu Meta Description': (page: CrawledPage) => !page.meta_description,
  'Thiếu H1': (page: CrawledPage) => !page.h1,
  'Title quá dài (>60)': (page: CrawledPage) => page.title && page.title.length > 60,
  'Description quá dài (>160)': (page: CrawledPage) => page.meta_description && page.meta_description.length > 160,
};

type FilterName = keyof typeof XPATH_FILTERS;
type TabName = FilterName | 'Visualization' | 'CustomXPath'; // Add new tab type

export default function AuditPage() {
  const [url, setUrl] = useState('https://www.tienziven.com');
  const [crawlId, setCrawlId] = useState<string | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<string>('idle'); // idle, running, completed, stopped, failed
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [allResults, setAllResults] = useState<CrawledPage[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('Tất cả trang');
  const [error, setError] = useState<string | null>(null);
  const [crawlHistory, setCrawlHistory] = useState<CrawlHistoryItem[]>([]);

  useEffect(() => {
    fetchCrawlHistory();
  }, []);

  // Polling for status
  useEffect(() => {
    if (crawlStatus !== 'running' || !crawlId) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await apiFetch(`/api/crawl/status/${crawlId}`);
        setPagesCrawled(statusData.pagesCrawled);

        if (statusData.isFinished) {
          setCrawlStatus(statusData.status); // completed, failed, stopped
          clearInterval(interval);
          // Fetch final results
          const resultsData = await apiFetch(`/api/crawl/results/${crawlId}?limit=10000`);
          setAllResults(resultsData.results);
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        setCrawlStatus('failed');
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [crawlStatus, crawlId]);

  const fetchCrawlHistory = async () => {
    try {
      const historyData = await apiFetch('/api/crawl');
      setCrawlHistory(historyData);
    } catch (err) {
      console.error("Failed to fetch crawl history:", err);
      // Optional: show a non-critical error to the user
    }
  };

  const handleStartCrawl = async () => {
    setError(null);
    setAllResults([]);
    setPagesCrawled(0);
    setCrawlId(null);
    setActiveTab('Tất cả trang');
    setCrawlStatus('running');

    try {
      const data = await apiFetch('/api/crawl/start', {
        method: 'POST',
        body: JSON.stringify({ startUrl: url }),
      });
      setCrawlId(data.crawl_id);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      setCrawlStatus('failed');
    }
  };
  
  const handleStopCrawl = async () => {
    if (!crawlId) return;
    try {
      await apiFetch(`/api/crawl/stop/${crawlId}`, { method: 'POST' });
      // The polling will eventually update the status to 'stopped'
      // We can optimistically update the UI if we want
      setCrawlStatus('stopping');
    } catch (err) {
       if (err instanceof Error) setError(err.message);
    }
  };

  const handleViewResults = async (selectedCrawl: CrawlHistoryItem) => {
    setCrawlId(selectedCrawl.id);
    setCrawlStatus(selectedCrawl.status);
    setError(null);
    setAllResults([]);
    setPagesCrawled(selectedCrawl.pages_crawled);
    setUrl(selectedCrawl.start_url);
    setActiveTab('Tất cả trang');
    
    // Scroll to top to see the results area
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        const resultsData = await apiFetch(`/api/crawl/results/${selectedCrawl.id}?limit=10000`);
        setAllResults(resultsData.results);
    } catch(err) {
        if (err instanceof Error) setError(err.message);
    }
  }

  const filteredResults = useMemo(() => {
    if (activeTab === 'Visualization' || activeTab === 'CustomXPath' || !XPATH_FILTERS[activeTab as FilterName]) {
      return allResults;
    }
    const filterFn = XPATH_FILTERS[activeTab as FilterName];
    return allResults.filter(page => filterFn(page));
  }, [allResults, activeTab]);
  
  const allTabNames: TabName[] = ['Tất cả trang', ...Object.keys(XPATH_FILTERS).filter(t => t !== 'Tất cả trang') as FilterName[], 'Visualization', 'CustomXPath'];

  const renderContent = () => {
    if (activeTab === 'Visualization') {
      return <SiteVisualizer results={allResults} startUrl={url} />;
    }
    if (activeTab === 'CustomXPath') {
      return <CustomXPathExtractor />;
    }
    return (
      <AuditResults
        results={filteredResults}
        totalCrawled={pagesCrawled}
        filterTitle={activeTab}
      />
    );
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Bắt đầu một phiên Audit mới</h1>
      <p className="mt-1 text-gray-600">
        Nhập một URL để crawl toàn bộ website (tối đa 10,000 URL) và phân tích các yếu tố SEO.
      </p>

      <div className="mt-6">
        <label htmlFor="start-url" className="block text-sm font-medium text-gray-700">URL bắt đầu</label>
        <div className="flex mt-1 space-x-2">
           <input
            type="url"
            id="start-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="https://www.tienziven.com"
            disabled={crawlStatus === 'running'}
          />
           {crawlStatus !== 'running' && crawlStatus !== 'stopping' ? (
            <button
              onClick={handleStartCrawl}
              disabled={!url}
              className="w-32 inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Bắt đầu
            </button>
          ) : (
             <button
              onClick={handleStopCrawl}
              className="w-32 inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              Dừng lại
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        {error && <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded-md"><h3 className="font-bold">Lỗi!</h3><p>{error}</p></div>}

        {crawlStatus !== 'idle' && (
          <div className="p-4 my-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">
              Trạng thái: <span className="font-bold">{crawlStatus}</span> | Số trang đã cào: <span className="font-bold">{pagesCrawled}</span>
            </p>
          </div>
        )}

        {(allResults.length > 0) && (
          <div>
            <div className="flex border-b border-gray-200">
              {allTabNames.map(tabName => (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  className={`px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                    activeTab === tabName
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tabName}
                </button>
              ))}
            </div>

            <div className="mt-4">{renderContent()}</div>
          </div>
        )}
      </div>

      {/* Crawl History Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">Lịch sử Crawl</h2>
        <div className="mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">URL</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Trạng thái</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Ngày tạo</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Số trang</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Hành động</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {crawlHistory.length > 0 ? crawlHistory.map((crawl) => (
                      <tr key={crawl.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{crawl.start_url}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{crawl.status}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(crawl.created_at).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{crawl.pages_crawled}</td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => handleViewResults(crawl)} className="text-indigo-600 hover:text-indigo-900">
                            Xem kết quả
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-sm text-gray-500">Chưa có lịch sử cào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
