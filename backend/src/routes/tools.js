const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

// POST /api/tools/import-xml
router.post('/import-xml', async (req, res) => {
  const { url, xpathExpression } = req.body;

  if (!url || !xpathExpression) {
    return res.status(400).json({ error: 'URL and XPath expression are required.' });
  }

  let browser = null;
  try {
    console.log('Launching visible browser for debugging...');
    browser = await puppeteer.launch({
      headless: false, // <-- This will show the browser window
      slowMo: 50, // Slows down Puppeteer operations by 50ms to make it easier to see what is happening
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log('Page loaded.');
    
    // Give page a little extra time for scripts
    await new Promise(r => setTimeout(r, 2000));

    // Evaluate XPath directly in the browser context to get URLs
    console.log(`Evaluating XPath: ${xpathExpression}`);
    const extractedUrls = await page.evaluate((xpath) => {
      const iterator = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      const urls = [];
      let element = iterator.iterateNext();
      while (element) {
        const urlText = element.textContent.trim();
        if (urlText) {
          urls.push(urlText);
        }
        element = iterator.iterateNext();
      }
      return urls;
    }, xpathExpression);
    
    console.log(`Found ${extractedUrls.length} URLs to process.`);

    const detailedResults = [];
    for (const extractedUrl of extractedUrls) {
      try {
        console.log(`Navigating to ${extractedUrl}...`);
        await page.goto(extractedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const details = await page.evaluate(() => {
          const title = document.title || '';
          const h1 = document.querySelector('h1')?.textContent.trim() || '';
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
          const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
          return { title, h1, metaDesc, canonical };
        });

        detailedResults.push({
          url: extractedUrl,
          ...details
        });
      } catch (e) {
        console.error(`Could not process ${extractedUrl}: ${e.message}`);
        detailedResults.push({
          url: extractedUrl,
          title: 'Error',
          h1: e.message,
          metaDesc: '',
          canonical: '',
        });
      }
    }

    res.json({ results: detailedResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing the content.', details: error.message });
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
});

module.exports = router;
