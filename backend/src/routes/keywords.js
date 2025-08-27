const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const axios = require('axios');

// POST /api/keywords/:keywordId/check - Kiểm tra thứ hạng
router.post('/:keywordId/check', async (req, res) => {
    const { keywordId } = req.params;
    const apiKey = process.env.SERPSTACK_API_KEY;

    try {
        // 1. Get keyword and project domain
        const { data: keyword, error: kwError } = await supabase
            .from('keywords')
            .select('*, project:projects(website_url)')
            .eq('id', keywordId)
            .single();
        if (kwError) throw kwError;
        
        const domain = new URL(keyword.project.website_url).hostname.replace('www.', '');

        // 2. Call SerpStack API
        const params = {
            access_key: apiKey,
            query: keyword.keyword_text,
            num_results: 100 // Check top 100
        };
        const serpRes = await axios.get('http://api.serpstack.com/search', { params });
        const searchResults = serpRes.data.organic_results;
        
        // 3. Find rank
        let rank = 0; // 0 means not found in top 100
        const found = searchResults.find(result => result.url.includes(domain));
        if (found) {
            rank = found.position;
        }

        // 4. Save rank to database
        const { error: rankError } = await supabase
            .from('rankings')
            .insert({ keyword_id: keywordId, rank: rank });
        if (rankError) throw rankError;

        res.json({ rank });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to check rank.', details: error.message });
    }
});


module.exports = router;
