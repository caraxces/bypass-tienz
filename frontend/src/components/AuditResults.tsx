import React from 'react';

// Định nghĩa kiểu dữ liệu cho một trang được crawl
interface CrawledPage {
  id: number;
  url: string;
  status_code: number;
  title: string;
  meta_description: string;
  h1: string;
  word_count: number;
}

interface AuditResultsProps {
  results: CrawledPage[];
}

const AuditResults: React.FC<AuditResultsProps> = ({ results }) => {
  if (!results || results.length === 0) {
    return <p>Không có dữ liệu để hiển thị.</p>;
  }

  return (
    <div className="mt-8 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">URL</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Meta Description</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">H1</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Word Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {results.map((page) => (
                  <tr key={page.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 max-w-xs truncate" title={page.url}>{page.url}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{page.status_code}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate" title={page.title}>{page.title}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate" title={page.meta_description}>{page.meta_description}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate" title={page.h1}>{page.h1}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{page.word_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditResults;
