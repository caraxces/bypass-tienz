const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const supabase = require('../supabaseClient');

/**
 * Check ranking cho một keyword cụ thể
 * POST /api/keyword-ranking-checker/check
 */
router.post('/check', async (req, res) => {
    const { keyword, projectId, searchEngine = 'google' } = req.body;
    
    if (!keyword || !projectId) {
        return res.status(400).json({ 
            error: 'Keyword và projectId là bắt buộc' 
        });
    }

    try {
        console.log(`🔍 Checking ranking for keyword: "${keyword}"`);
        
        const ranking = await checkKeywordRanking(keyword, searchEngine);
        
        // Lưu kết quả vào database
        await saveRankingResult(keyword, projectId, ranking, searchEngine);
        
        res.json({
            success: true,
            keyword,
            ranking,
            searchEngine,
            checkedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error checking keyword ranking:', error);
        res.status(500).json({ 
            error: error.message 
        });
    }
});

/**
 * Check ranking cho nhiều keywords cùng lúc
 * POST /api/keyword-ranking-checker/check-batch
 */
router.post('/check-batch', async (req, res) => {
    const { keywords, projectId, searchEngine = 'google' } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || !projectId) {
        return res.status(400).json({ 
            error: 'Keywords array và projectId là bắt buộc' 
        });
    }

    try {
        console.log(`🔍 Checking rankings for ${keywords.length} keywords`);
        
        const results = [];
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            try {
                console.log(`[${i + 1}/${keywords.length}] Checking: "${keyword}"`);
                const ranking = await checkKeywordRankingWithBrowser(browser, keyword, searchEngine);
                
                // Lưu kết quả
                await saveRankingResult(keyword, projectId, ranking, searchEngine);
                
                results.push({
                    keyword,
                    ranking,
                    success: true
                });
                
                // Delay để tránh bị block
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error checking keyword "${keyword}":`, error.message);
                results.push({
                    keyword,
                    ranking: null,
                    success: false,
                    error: error.message
                });
            }
        }

        await browser.close();
        
        res.json({
            success: true,
            results,
            totalChecked: keywords.length,
            searchEngine,
            checkedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error in batch keyword ranking check:', error);
        res.status(500).json({ 
            error: error.message 
        });
    }
});

/**
 * Lấy lịch sử ranking của một keyword
 * GET /api/keyword-ranking-checker/history/:keywordId
 */
router.get('/history/:keywordId', async (req, res) => {
    const { keywordId } = req.params;
    
    try {
        const { data: rankings, error } = await supabase
            .from('rankings')
            .select('*')
            .eq('keyword_id', keywordId)
            .order('checked_at', { ascending: false })
            .limit(30); // Lấy 30 kết quả gần nhất
            
        if (error) throw error;
        
        res.json({
            success: true,
            rankings: rankings || []
        });
        
    } catch (error) {
        console.error('Error fetching ranking history:', error);
        res.status(500).json({ 
            error: error.message 
        });
    }
});

/**
 * Check ranking cho một keyword sử dụng Puppeteer
 */
async function checkKeywordRanking(keyword, searchEngine = 'google') {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const ranking = await checkKeywordRankingWithBrowser(browser, keyword, searchEngine);
        return ranking;
    } finally {
        await browser.close();
    }
}

/**
 * Check ranking với browser instance có sẵn
 */
async function checkKeywordRankingWithBrowser(browser, keyword, searchEngine) {
    const page = await browser.newPage();
    
    try {
        // Set user agent để tránh bị detect
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Tạo search URL
        let searchUrl;
        if (searchEngine === 'google') {
            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=100`;
        } else if (searchEngine === 'bing') {
            searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&count=100`;
        } else {
            throw new Error(`Search engine không được hỗ trợ: ${searchEngine}`);
        }
        
        console.log(`🌐 Searching: ${searchUrl}`);
        
        // Navigate to search page
        await page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait for results to load
        await page.waitForTimeout(3000);
        
        // Extract ranking information
        const ranking = await page.evaluate((searchEngine) => {
            if (searchEngine === 'google') {
                return extractGoogleRankings();
            } else if (searchEngine === 'bing') {
                return extractBingRankings();
            }
        }, searchEngine);
        
        return ranking;
        
    } finally {
        await page.close();
    }
}

/**
 * Extract rankings từ Google search results
 */
function extractGoogleRankings() {
    const results = [];
    const searchResults = document.querySelectorAll('#search .g, .rc, [data-hveid]');
    
    searchResults.forEach((result, index) => {
        const position = index + 1;
        const titleElement = result.querySelector('h3, .LC20lb, .DKV0Md');
        const urlElement = result.querySelector('a[href]');
        const snippetElement = result.querySelector('.VwiC3b, .st, .aCOpRe');
        
        if (titleElement && urlElement) {
            const title = titleElement.textContent.trim();
            const url = urlElement.href;
            const snippet = snippetElement ? snippetElement.textContent.trim() : '';
            
            results.push({
                position,
                title,
                url,
                snippet,
                isOwned: false // Sẽ được check sau
            });
        }
    });
    
    return {
        totalResults: results.length,
        rankings: results,
        searchEngine: 'google'
    };
}

/**
 * Extract rankings từ Bing search results
 */
function extractBingRankings() {
    const results = [];
    const searchResults = document.querySelectorAll('.b_algo, .b_title');
    
    searchResults.forEach((result, index) => {
        const position = index + 1;
        const titleElement = result.querySelector('h2 a, .b_title a');
        const urlElement = result.querySelector('a[href]');
        const snippetElement = result.querySelector('.b_caption p, .b_snippet');
        
        if (titleElement && urlElement) {
            const title = titleElement.textContent.trim();
            const url = urlElement.href;
            const snippet = snippetElement ? snippetElement.textContent.trim() : '';
            
            results.push({
                position,
                title,
                url,
                snippet,
                isOwned: false
            });
        }
    });
    
    return {
        totalResults: results.length,
        rankings: results,
        searchEngine: 'bing'
    };
}

/**
 * Lưu kết quả ranking vào database
 */
async function saveRankingResult(keyword, projectId, ranking, searchEngine) {
    try {
        // Tìm keyword trong database
        const { data: keywordData, error: keywordError } = await supabase
            .from('keywords')
            .select('id')
            .eq('keyword_text', keyword)
            .eq('project_id', projectId)
            .single();
            
        if (keywordError || !keywordData) {
            console.warn(`Keyword "${keyword}" not found in database`);
            return;
        }
        
        const keywordId = keywordData.id;
        
        // Lưu ranking vào bảng rankings
        const { error: rankingError } = await supabase
            .from('rankings')
            .insert({
                keyword_id: keywordId,
                rank: ranking.rankings.length > 0 ? ranking.rankings[0].position : null,
                search_engine: searchEngine,
                total_results: ranking.totalResults,
                ranking_data: ranking.rankings, // Lưu toàn bộ data dưới dạng JSON
                checked_at: new Date().toISOString()
            });
            
        if (rankingError) {
            console.error('Error saving ranking result:', rankingError);
        } else {
            console.log(`✅ Saved ranking for keyword "${keyword}": Position ${ranking.rankings.length > 0 ? ranking.rankings[0].position : 'N/A'}`);
        }
        
        // Cập nhật keyword với thông tin mới nhất
        const { error: updateError } = await supabase
            .from('keywords')
            .update({
                position: ranking.rankings.length > 0 ? ranking.rankings[0].position : null,
                last_checked: new Date().toISOString(),
                has_error: false
            })
            .eq('id', keywordId);
            
        if (updateError) {
            console.error('Error updating keyword:', updateError);
        }
        
    } catch (error) {
        console.error('Error saving ranking result:', error);
    }
}

module.exports = router;
