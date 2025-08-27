const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JSDOM } = require('jsdom');
const xpath = require('xpath');

// POST /api/tools/import-xml
router.post('/import-xml', async (req, res) => {
  const { url, xpathExpression } = req.body;

  if (!url || !xpathExpression) {
    return res.status(400).json({ error: 'URL and XPath expression are required.' });
  }

  try {
    // 1. Fetch the content from the URL
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const content = response.data;

    // 2. Parse the content using JSDOM
    // JSDOM is robust and can handle messy HTML/XML like a browser
    const dom = new JSDOM(content, { contentType: "application/xml" });
    const doc = dom.window.document;

    // 3. Select nodes using the standard XPath library
    const nodes = xpath.select(xpathExpression, doc);

    // 4. Extract text content from the selected nodes
    const results = nodes.map(node => (node.textContent || node.nodeValue || '').trim());

    res.json({ results });
  } catch (error) {
    console.error(error);
    if (axios.isAxiosError(error)) {
      return res.status(500).json({ error: `Failed to fetch from URL: ${error.message}` });
    }
    res.status(500).json({ error: 'An error occurred while processing the content.', details: error.message });
  }
});

module.exports = router;
