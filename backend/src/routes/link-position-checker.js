const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

router.post('/check', async (req, res) => {
    // Add 'mode' to distinguish between 'single' check and 'batch' check
    const { pageUrl, targetLink, xpathExpression, mode } = req.body;

    if (!pageUrl || !targetLink || !xpathExpression) {
        return res.status(400).json({ error: 'Page URL, target link, and XPath expression are required.' });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        if (mode === 'batch') {
            // New logic for batch processing from sitemap/listing page
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            const urlsToCheck = await page.evaluate((xpath) => {
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

            if (urlsToCheck.length === 0) {
                return res.json({ results: [], message: 'Không tìm thấy URL nào với XPath đã cho.' });
            }

            const results = [];
            for (const url of urlsToCheck) {
                try {
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                    const linksData = await page.evaluate((target) => {
                        const allLinks = Array.from(document.body.querySelectorAll('a')).map(a => a.href);
                        const found = allLinks.includes(target);
                        let position = -1;
                        if (found) {
                            position = allLinks.findIndex(href => href === target) + 1;
                        }
                        return { found, position, totalLinks: allLinks.length };
                    }, targetLink);

                    results.push({ url, ...linksData });
                } catch (e) {
                    results.push({
                        url,
                        found: false,
                        position: -1,
                        totalLinks: 0,
                        error: `Lỗi khi xử lý URL: ${e.message.split('\\n')[0]}`
                    });
                }
            }
            
            res.json({ results });

        } else {
            // Original logic for single page check with screenshot
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            try {
                await page.waitForFunction(
                    xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
                    { timeout: 10000 },
                    xpathExpression
                );
            } catch (e) {
                return res.json({ found: false, message: 'Không tìm thấy vùng nội dung với XPath đã cho trong vòng 10 giây.', image: null });
            }
            
            const elementHandle = await page.evaluateHandle(
                xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
                xpathExpression
            );

            if (!elementHandle.asElement()) {
                return res.json({ found: false, message: 'Đã tìm thấy nhưng không thể lấy được vùng nội dung. XPath có thể không trỏ đến một phần tử hợp lệ.', image: null });
            }

            const imageBuffer = await elementHandle.screenshot({ encoding: 'base64' });

            const linksData = await page.evaluate((element, target) => {
                const allLinks = Array.from(element.querySelectorAll('a')).map(a => a.href);
                const found = allLinks.includes(target);
                let position = -1;
                if (found) {
                    position = allLinks.findIndex(href => href === target) + 1;
                }
                return {
                    found: found,
                    position: position,
                    totalLinks: allLinks.length,
                };
            }, elementHandle, targetLink);

            if (linksData.found) {
                res.json({
                    found: true,
                    position: linksData.position,
                    totalLinks: linksData.totalLinks,
                    image: imageBuffer
                });
            } else {
                 res.json({
                    found: false,
                    message: `Không tìm thấy link trong vùng nội dung. Tổng số link trong vùng: ${linksData.totalLinks}.`,
                    image: imageBuffer
                });
            }
        }

    } catch (error) {
        console.error('Error in link position checker:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi phân tích trang.', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

module.exports = router;
