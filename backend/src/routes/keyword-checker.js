const express = require('express');
const router = express.Router();
const axios = require('axios');

const getTopResults = async (apiKey, keyword) => {
    try {
        const params = {
            access_key: apiKey,
            query: keyword,
            num_results: 10 
        };
        const serpRes = await axios.get('http://api.serpstack.com/search', { params });
        if (serpRes.data && serpRes.data.organic_results) {
            return serpRes.data.organic_results.map(r => r.url);
        }
        return [];
    } catch (error) {
        console.error(`Failed to fetch SERP for ${keyword}`, error);
        return [];
    }
};

// POST /api/keyword-checker/find-similar
router.post('/find-similar', async (req, res) => {
    const { keywords, threshold } = req.body;
    const apiKey = process.env.SERPSTACK_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'SerpStack API key is not configured.' });
    if (!keywords || !Array.isArray(keywords) || keywords.length < 2) {
        return res.status(400).json({ error: 'Please provide at least two keywords.' });
    }

    try {
        const serpResults = {};
        for (const keyword of keywords) {
            serpResults[keyword] = await getTopResults(apiKey, keyword);
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay to avoid rate limiting
        }

        const keywordGroups = [];
        const processedKeywords = new Set();

        for (let i = 0; i < keywords.length; i++) {
            const kw1 = keywords[i];
            if (processedKeywords.has(kw1)) continue;

            const currentGroup = [kw1];
            processedKeywords.add(kw1);

            for (let j = i + 1; j < keywords.length; j++) {
                const kw2 = keywords[j];
                if (processedKeywords.has(kw2)) continue;

                const urls1 = new Set(serpResults[kw1]);
                const urls2 = new Set(serpResults[kw2]);
                const intersection = new Set([...urls1].filter(url => urls2.has(url)));
                
                // Use a dynamic threshold, default to 0.6 if not provided
                const similarityThreshold = threshold || 0.6;
                const similarity = intersection.size / Math.min(urls1.size, urls2.size);

                if (similarity >= similarityThreshold) {
                    currentGroup.push(kw2);
                    processedKeywords.add(kw2);
                }
            }
            if (currentGroup.length > 1) {
                keywordGroups.push(currentGroup);
            }
        }
        
        res.json({ keywordGroups });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred during keyword analysis.', details: error.message });
    }
});

module.exports = router;
