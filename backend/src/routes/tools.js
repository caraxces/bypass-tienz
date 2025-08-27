const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const path = require('path'); // For saving screenshot

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
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    console.log('Page loaded.');
    
    // Give page a little extra time for scripts
    await new Promise(r => setTimeout(r, 2000));

    const screenshotPath = path.join(__dirname, '..', '..', 'debug.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Evaluate XPath directly in the browser context
    console.log(`Evaluating XPath: ${xpathExpression}`);
    const results = await page.evaluate((xpath) => {
      const iterator = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
      const elements = [];
      let element = iterator.iterateNext();
      while (element) {
        elements.push(element.textContent.trim());
        element = iterator.iterateNext();
      }
      return elements;
    }, xpathExpression);
    
    console.log(`Found ${results.length} results.`);

    res.json({ results });
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
