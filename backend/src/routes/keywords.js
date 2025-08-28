const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const puppeteer = require('puppeteer'); // Import Puppeteer
const { getJson } = require("serpapi");
require('dotenv').config();
const authMiddleware = require('../middleware/authMiddleware'); // Import authMiddleware

// Hàm helper để tìm kiếm và trích xuất thứ hạng theo chuẩn SEO
async function findKeywordRank(keywordText, domain) {
    console.log(`[SerpApi] Bắt đầu tìm kiếm ranking cho keyword: "${keywordText}" với domain: "${domain}"`);
    
    try {
        const response = await getJson({
            engine: "google",
            q: keywordText,
            location: "Vietnam",
            google_domain: "google.com.vn",
            gl: "vn",
            hl: "vi",
            num: 100, // Lấy 100 kết quả
            api_key: process.env.SERPAPI_KEY
        });

        const organicResults = response.organic_results;
        if (!organicResults || organicResults.length === 0) {
            console.log('[SerpApi] Không tìm thấy kết quả tự nhiên nào.');
            return null;
        }

        for (const result of organicResults) {
            if (result.link && result.link.includes(domain)) {
                console.log(`[SerpApi] TÌM THẤY! Domain "${domain}" ở vị trí ${result.position}.`);
                return result.position;
            }
        }

        console.log(`[SerpApi] Không tìm thấy domain "${domain}" trong top 100.`);
        return null; // Không tìm thấy

    } catch (error) {
        console.error('[SerpApi] Đã xảy ra lỗi khi gọi API:', error.message);
        throw new Error('Lỗi khi kiểm tra thứ hạng từ SerpApi.');
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

// === API MỚI CHO VIỆC NHẬP TAY THỨ HẠNG ===
router.put('/:keywordId/manual-rank', authMiddleware, async (req, res) => {
    const { keywordId } = req.params;
    const { rank } = req.body;
    const userId = req.user.id;

    if (rank === null || rank === undefined || isNaN(parseInt(rank))) {
        return res.status(400).json({ message: 'Thứ hạng không hợp lệ.' });
    }

    const newRank = parseInt(rank);

    try {
        // Bước 1: Lấy thông tin keyword để kiểm tra quyền sở hữu
        const { data: keywordData, error: keywordError } = await supabase
            .from('keywords')
            .select(`
                id,
                project_id,
                projects (
                    user_id
                )
            `)
            .eq('id', keywordId)
            .single();

        if (keywordError || !keywordData) {
            return res.status(404).json({ message: 'Không tìm thấy từ khóa.' });
        }

        if (keywordData.projects.user_id !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật từ khóa này.' });
        }
        
        // Bước 2: Cập nhật `latest_rank` trong bảng `keywords`
        const { data: updatedKeyword, error: updateError } = await supabase
            .from('keywords')
            .update({ latest_rank: newRank, last_checked: new Date().toISOString() })
            .eq('id', keywordId)
            .select()
            .single();

        if (updateError) {
            console.error('Lỗi khi cập nhật bảng keywords:', updateError);
            throw updateError;
        }

        // Bước 3: Ghi lại lịch sử vào bảng `rankings`
        const { error: insertError } = await supabase
            .from('rankings')
            .insert({
                keyword_id: keywordId,
                rank: newRank,
                checked_at: new Date().toISOString(),
                search_engine: 'manual', // Đánh dấu đây là bản ghi nhập tay
                is_owned: true // Vì là nhập tay nên mặc định là sở hữu
            });

        if (insertError) {
            // Dù có lỗi ghi lịch sử, vẫn trả về thành công vì keyword đã được cập nhật
            console.error('Lỗi khi ghi lịch sử ranking (nhập tay):', insertError);
        }

        res.json({ message: 'Cập nhật thứ hạng thành công.', keyword: updatedKeyword });

    } catch (error) {
        console.error('Lỗi khi cập nhật thứ hạng thủ công:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});


module.exports = router;
