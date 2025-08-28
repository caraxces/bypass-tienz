'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface KeywordRanking {
  id: string;
  keyword_text: string;
  position: number | null;
  last_checked: string | null;
  has_error: boolean;
  project_id: string;
}

interface RankingHistory {
  id: string;
  rank: number | null;
  search_engine: string;
  total_results: number;
  checked_at: string;
  ranking_data: any[];
}

interface KeywordRankingManagerProps {
  projectId: string;
  keywords: KeywordRanking[];
  onRefresh: () => void;
}

export default function KeywordRankingManager({ projectId, keywords, onRefresh }: KeywordRankingManagerProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [rankingHistory, setRankingHistory] = useState<{ [key: string]: RankingHistory[] }>({});
  const [showHistory, setShowHistory] = useState<string | null>(null);

  // Chọn tất cả keywords
  const selectAllKeywords = () => {
    if (selectedKeywords.length === keywords.length) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(keywords.map(k => k.id));
    }
  };

  // Check ranking cho keywords đã chọn
  const checkSelectedKeywords = async () => {
    if (selectedKeywords.length === 0) {
      alert('Vui lòng chọn ít nhất một keyword để check ranking');
      return;
    }

    setIsChecking(true);
    setCheckProgress(0);

    try {
      const selectedKeywordTexts = keywords
        .filter(k => selectedKeywords.includes(k.id))
        .map(k => k.keyword_text);

      const response = await fetch('/api/keyword-ranking-checker/check-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: selectedKeywordTexts,
          projectId,
          searchEngine: 'google'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check keywords');
      }

      const result = await response.json();
      console.log('Batch check result:', result);

      // Cập nhật progress
      setCheckProgress(100);
      
      // Refresh data
      setTimeout(() => {
        onRefresh();
        setIsChecking(false);
        setCheckProgress(0);
        setSelectedKeywords([]);
      }, 1000);

    } catch (error) {
      console.error('Error checking keywords:', error);
      alert('Có lỗi xảy ra khi check ranking');
      setIsChecking(false);
      setCheckProgress(0);
    }
  };

  // Check ranking cho một keyword
  const checkSingleKeyword = async (keywordId: string, keywordText: string) => {
    try {
      const response = await fetch('/api/keyword-ranking-checker/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keywordText,
          projectId,
          searchEngine: 'google'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check keyword');
      }

      const result = await response.json();
      console.log('Single check result:', result);

      // Refresh data
      onRefresh();

    } catch (error) {
      console.error('Error checking keyword:', error);
      alert('Có lỗi xảy ra khi check ranking');
    }
  };

  // Lấy lịch sử ranking
  const fetchRankingHistory = async (keywordId: string) => {
    if (rankingHistory[keywordId]) {
      setShowHistory(showHistory === keywordId ? null : keywordId);
      return;
    }

    try {
      const response = await fetch(`/api/keyword-ranking-checker/history/${keywordId}`);
      if (!response.ok) throw new Error('Failed to fetch history');

      const result = await response.json();
      setRankingHistory(prev => ({
        ...prev,
        [keywordId]: result.rankings
      }));
      setShowHistory(keywordId);
    } catch (error) {
      console.error('Error fetching ranking history:', error);
    }
  };

  // Format position display
  const formatPosition = (position: number | null) => {
    if (position === null) return 'N/A';
    if (position <= 10) return `🥇 ${position}`;
    if (position <= 50) return `🥈 ${position}`;
    if (position <= 100) return `🥉 ${position}`;
    return `📊 ${position}`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa check';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Quản lý Keyword Rankings
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={selectAllKeywords}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            {selectedKeywords.length === keywords.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
          <button
            onClick={checkSelectedKeywords}
            disabled={selectedKeywords.length === 0 || isChecking}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isChecking ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Đang check... {checkProgress}%</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                <span>Check Ranking ({selectedKeywords.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {isChecking && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${checkProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Keywords table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedKeywords.length === keywords.length}
                  onChange={selectAllKeywords}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keyword
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thứ hạng (Top 100)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lần check cuối
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {keywords.map((keyword) => (
              <tr key={keyword.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.includes(keyword.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedKeywords(prev => [...prev, keyword.id]);
                      } else {
                        setSelectedKeywords(prev => prev.filter(id => id !== keyword.id));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {keyword.keyword_text}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="font-semibold">
                    {formatPosition(keyword.position)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(keyword.last_checked)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {keyword.has_error ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Lỗi
                    </span>
                  ) : keyword.position ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      Chưa check
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => checkSingleKeyword(keyword.id, keyword.keyword_text)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Check
                  </button>
                  <button
                    onClick={() => fetchRankingHistory(keyword.id)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Lịch sử
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ranking History Modal */}
      {showHistory && rankingHistory[showHistory] && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Lịch sử Ranking
              </h3>
              <button
                onClick={() => setShowHistory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thứ hạng</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Search Engine</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tổng kết quả</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankingHistory[showHistory].map((ranking) => (
                    <tr key={ranking.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(ranking.checked_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-semibold">
                        {formatPosition(ranking.rank)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {ranking.search_engine}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {ranking.total_results}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
