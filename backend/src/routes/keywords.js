const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const puppeteer = require('puppeteer'); // Import Puppeteer

// Hàm helper để tìm kiếm và trích xuất thứ hạng
async function findKeywordRank(keywordText, domainToFind) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keywordText)}&num=100&gl=us&hl=en`;
        console.log(`Navigating to ${searchUrl} to find domain ${domainToFind}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        const rank = await page.evaluate((domain) => {
            const searchResults = document.querySelectorAll('#search .g, #search .rc, #search [data-hveid]');
            let foundPosition = null;

            searchResults.forEach((result, index) => {
                const urlElement = result.querySelector('a[href]');
                if (urlElement && urlElement.href.includes(domain)) {
                    if (foundPosition === null) { // Chỉ lấy vị trí đầu tiên tìm thấy
                        foundPosition = index + 1;
                    }
                }
            });

            return foundPosition;
        }, domainToFind);

        return rank;

    } finally {
        await browser.close();
    }
}


// POST /api/keywords/:keywordId/check - Kiểm tra và cập nhật thứ hạng bằng Puppeteer
router.post('/:keywordId/check', async (req, res) => {
    const { keywordId } = req.params;

    try {
        // 1. Lấy thông tin keyword và domain của project
        console.log(`Fetching keyword data for id: ${keywordId}`);
        const { data: keyword, error: kwError } = await supabase
            .from('keywords')
            .select('id, keyword_text, project:projects(website_url)')
            .eq('id', keywordId)
            .single();

        if (kwError) throw kwError;
        if (!keyword) return res.status(404).json({ error: 'Keyword not found.' });
        if (!keyword.project || !keyword.project.website_url) {
            return res.status(400).json({ error: 'Project domain is not configured for this keyword.' });
        }

        const domain = new URL(keyword.project.website_url).hostname.replace('www.', '');

        // 2. Sử dụng Puppeteer để tìm thứ hạng
        console.log(`Checking rank for keyword "${keyword.keyword_text}" on domain "${domain}"`);
        const rank = await findKeywordRank(keyword.keyword_text, domain);
        console.log(`Rank found: ${rank || 'Not in top 100'}`);

        const newRank = rank ? rank : null; // null nếu không tìm thấy

        // 3. Lưu kết quả vào bảng 'rankings' (để có lịch sử)
        const { error: rankError } = await supabase
            .from('rankings')
            .insert({ 
                keyword_id: keywordId, 
                rank: newRank,
                checked_at: new Date().toISOString(),
                search_engine: 'google'
             });
        if (rankError) {
            console.error("Error saving to rankings table:", rankError);
            // Không throw lỗi ở đây để vẫn có thể cập nhật keyword
        }

        // 4. Cập nhật trực tiếp keyword với thứ hạng mới nhất
        const { data: updatedKeyword, error: updateError } = await supabase
            .from('keywords')
            .update({ 
                position: newRank,
                last_checked: new Date().toISOString()
            })
            .eq('id', keywordId)
            .select()
            .single();
        
        if (updateError) throw updateError;

        // 5. Trả về thông tin keyword đã được cập nhật
        res.json({
            message: 'Rank checked successfully.',
            rank: newRank,
            keyword: updatedKeyword
        });

    } catch (error) {
        console.error('Failed to check rank:', error);
        res.status(500).json({ error: 'Failed to check rank.', details: error.message });
    }
});


module.exports = router;
