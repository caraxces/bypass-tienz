const express = require('express');
const router = express.Router();
const axios = require('axios');

const checkSingleKeyword = async (apiKey, domain, keyword) => {
    try {
        const params = {
            access_key: apiKey,
            query: keyword,
            num_results: 100
        };
        const serpRes = await axios.get('http://api.serpstack.com/search', { params });
        
        if (serpRes.data && serpRes.data.organic_results) {
            const searchResults = serpRes.data.organic_results;
            const found = searchResults.find(result => result.url.includes(domain));
            return { keyword, rank: found ? found.position : 0 };
        }
        return { keyword, rank: null, error: 'Invalid API response' };

    } catch (error) {
        return { keyword, rank: null, error: error.message };
    }
}

// POST /api/rank-checker/check - Kiểm tra nhanh thứ hạng nhiều từ khóa
router.post('/check', async (req, res) => {
    const { websiteUrl, keywords } = req.body;
    const apiKey = process.env.SERPSTACK_API_KEY;

    if (!websiteUrl || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: 'Website URL and a non-empty array of keywords are required.' });
    }
     if (!apiKey) {
        return res.status(500).json({ error: 'SerpStack API key is not configured on the server.' });
    }

    try {
        const domain = new URL(websiteUrl).hostname.replace('www.', '');

        // Run checks in parallel for better performance
        const promises = keywords.map(keyword => checkSingleKeyword(apiKey, domain, keyword));
        const results = await Promise.all(promises);

        res.json(results);

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while checking ranks.', details: error.message });
    }
});

module.exports = router;
