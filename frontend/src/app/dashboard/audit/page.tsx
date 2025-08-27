'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import AuditResults from '@/components/AuditResults';
import CustomXPathExtractor from '@/components/CustomXPathExtractor'; // Import component mới
import dynamic from 'next/dynamic';

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
  const [crawlStatus, setCrawlStatus] = useState<string>('idle'); // idle, crawling, completed, failed
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [allResults, setAllResults] = useState<CrawledPage[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('Tất cả trang'); // Update state name
  const [error, setError] = useState<string | null>(null);
  const pagesFetched = useRef(0);

  // Polling for status and incremental results
  useEffect(() => {
    if (crawlStatus !== 'crawling' || !crawlId) return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`http://localhost:3001/api/crawl/status/${crawlId}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusData.error || 'Failed to fetch status');
        setPagesCrawled(statusData.pagesCrawled);

        // Fetch new results in batches of 20
        if (statusData.pagesCrawled > pagesFetched.current) {
          const pageToFetch = Math.floor(pagesFetched.current / 20) + 1;
          
          const resultsRes = await fetch(`http://localhost:3001/api/crawl/results/${crawlId}?page=${pageToFetch}&limit=20`);
          const resultsData = await resultsRes.json();
          if (!resultsRes.ok) throw new Error(resultsData.error || 'Failed to fetch results');
          
          if (resultsData.data && resultsData.data.length > 0) {
            setAllResults(prevResults => {
              const newResults = [...prevResults, ...resultsData.data];
              pagesFetched.current = newResults.length;
              return newResults;
            });
          }
        }

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setCrawlStatus(statusData.status);
          clearInterval(interval);
        }
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        setCrawlStatus('failed');
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [crawlStatus, crawlId]);

  const handleStartCrawl = async () => {
    setError(null);
    setAllResults([]);
    setPagesCrawled(0);
    pagesFetched.current = 0;
    setCrawlId(null);
    setActiveTab('Tất cả trang');
    setCrawlStatus('crawling');

    try {
      const res = await fetch('http://localhost:3001/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      // Improved Error Handling
      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errData = await res.json();
          throw new Error(errData.error || `Server error: ${res.status}`);
        } else {
          const textError = await res.text();
          throw new Error(`Server returned a non-JSON response: ${textError}`);
        }
      }

      const data = await res.json();
      setCrawlId(data.crawl_id);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      setCrawlStatus('failed');
    }
  };

  const filteredResults = useMemo(() => {
    if (activeTab === 'Visualization' || activeTab === 'CustomXPath' || !XPATH_FILTERS[activeTab as FilterName]) {
      return allResults;
    }
    const filterFn = XPATH_FILTERS[activeTab as FilterName].filter;
    return allResults.filter(page => filterFn(page.html_content || ''));
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
        filterTitle={XPATH_FILTERS[activeTab as FilterName]?.title || 'Tất cả các trang đã quét'}
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
            disabled={crawlStatus === 'crawling'}
          />
           <button
            onClick={handleStartCrawl}
            disabled={crawlStatus === 'crawling' || !url}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {crawlStatus === 'crawling' ? `Đang crawl... (${pagesCrawled})` : 'Bắt đầu Crawl'}
          </button>
        </div>
      </div>
      
      <div className="mt-6">
        {error && <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded-md"><h3 className="font-bold">Lỗi!</h3><p>{error}</p></div>}

        {(crawlStatus !== 'idle' && allResults.length > 0) && (
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
                  {XPATH_FILTERS[tabName as FilterName]?.title || (tabName === 'Visualization' ? 'Trực quan hóa' : 'Trích xuất XPath')}
                </button>
              ))}
            </div>

            <div className="mt-4">{renderContent()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
