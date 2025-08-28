require('dotenv').config({ path: './.env' });
const supabase = require('./supabaseClient');
const puppeteer = require('puppeteer');

// --- CẤU HÌNH ---
const SEARCH_ENGINE = 'google'; // 'google' hoặc 'bing'
const DELAY_BETWEEN_SEARCHES = 3000; // 3 giây giữa các lần search
const MAX_KEYWORDS_PER_BATCH = 10; // Số keywords check cùng lúc

/**
 * Check ranking cho tất cả keywords trong database
 */
async function checkAllKeywordsRanking() {
    console.log('🔍 Starting keyword ranking check for all keywords...\n');
    
    try {
        // 1. Lấy tất cả keywords chưa có ranking hoặc ranking cũ
        const { data: keywords, error: keywordsError } = await supabase
            .from('keywords')
            .select(`
                id,
                keyword_text,
                project_id,
                position,
                last_checked
            `)
            .order('created_at', { ascending: true });
            
        if (keywordsError) {
            throw new Error(`Error fetching keywords: ${keywordsError.message}`);
        }
        
        console.log(`📊 Found ${keywords.length} keywords to check`);
        
        // 2. Lọc keywords cần check (chưa có ranking hoặc ranking cũ hơn 7 ngày)
        const keywordsToCheck = keywords.filter(keyword => {
            if (!keyword.last_checked) return true;
            
            const lastChecked = new Date(keyword.last_checked);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            return lastChecked < sevenDaysAgo;
        });
        
        console.log(`📅 ${keywordsToCheck.length} keywords need ranking update (older than 7 days or never checked)`);
        
        if (keywordsToCheck.length === 0) {
            console.log('✅ All keywords are up to date!');
            return;
        }
        
        // 3. Chia thành batches để xử lý
        const batches = [];
        for (let i = 0; i < keywordsToCheck.length; i += MAX_KEYWORDS_PER_BATCH) {
            batches.push(keywordsToCheck.slice(i, i + MAX_KEYWORDS_PER_BATCH));
        }
        
        console.log(`🔄 Processing ${batches.length} batches of ${MAX_KEYWORDS_PER_BATCH} keywords each\n`);
        
        // 4. Xử lý từng batch
        let totalProcessed = 0;
        let totalSuccess = 0;
        let totalErrors = 0;
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} keywords)`);
            
            const batchResults = await processKeywordBatch(batch);
            
            totalProcessed += batch.length;
            totalSuccess += batchResults.successCount;
            totalErrors += batchResults.errorCount;
            
            console.log(`✅ Batch ${batchIndex + 1} completed: ${batchResults.successCount} success, ${batchResults.errorCount} errors`);
            
            // Delay giữa các batch
            if (batchIndex < batches.length - 1) {
                console.log(`⏳ Waiting ${DELAY_BETWEEN_SEARCHES/1000}s before next batch...`);
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SEARCHES));
            }
        }
        
        // 5. Hiển thị kết quả cuối cùng
        console.log('\n🎯 FINAL RESULTS:');
        console.log(`Total keywords processed: ${totalProcessed}`);
        console.log(`Successful: ${totalSuccess}`);
        console.log(`Errors: ${totalErrors}`);
        console.log(`Success rate: ${((totalSuccess / totalProcessed) * 100).toFixed(2)}%`);
        
    } catch (error) {
        console.error('❌ Error in keyword ranking check:', error);
    }
}

/**
 * Xử lý một batch keywords
 */
async function processKeywordBatch(keywords) {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
        for (let i = 0; i < keywords.length; i++) {
            const keyword = keywords[i];
            try {
                console.log(`  [${i + 1}/${keywords.length}] Checking: "${keyword.keyword_text}"`);
                
                const ranking = await checkKeywordRanking(browser, keyword.keyword_text, SEARCH_ENGINE);
                
                // Lưu kết quả vào database
                await saveRankingResult(keyword.keyword_text, keyword.project_id, ranking, SEARCH_ENGINE);
                
                successCount++;
                console.log(`    ✅ Position: ${ranking.rankings.length > 0 ? ranking.rankings[0].position : 'N/A'}`);
                
                // Delay giữa các keywords
                if (i < keywords.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`    ❌ Error checking "${keyword.keyword_text}":`, error.message);
                errorCount++;
            }
        }
    } finally {
        await browser.close();
    }
    
    return { successCount, errorCount };
}

/**
 * Check ranking cho một keyword
 */
async function checkKeywordRanking(browser, keyword, searchEngine) {
    const page = await browser.newPage();
    
    try {
        // Set user agent
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
        
        // Navigate to search page
        await page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait for results
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
                isOwned: false
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
            console.warn(`    ⚠️  Keyword "${keyword}" not found in database`);
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
                ranking_data: ranking.rankings,
                checked_at: new Date().toISOString()
            });
            
        if (rankingError) {
            console.error('    ❌ Error saving ranking result:', rankingError);
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
            console.error('    ❌ Error updating keyword:', updateError);
        }
        
    } catch (error) {
        console.error('    ❌ Error saving ranking result:', error);
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('--- Starting All Keywords Ranking Check ---\n');
        await checkAllKeywordsRanking();
        console.log('\n--- Ranking check completed! ---');
    } catch (error) {
        console.error('\n--- RANKING CHECK FAILED ---');
        console.error(error.message);
        process.exit(1);
    }
}

main();
