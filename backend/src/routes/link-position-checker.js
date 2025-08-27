const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

router.post('/check', async (req, res) => {
    const { pageUrl, targetLink, xpathExpression } = req.body;

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
        // Increase timeout to 60s and use a more lenient wait condition
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // Use a more robust waiting mechanism
        try {
            await page.waitForFunction(
                xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
                { timeout: 10000 },
                xpathExpression
            );
        } catch (e) {
            return res.json({ found: false, message: 'Không tìm thấy vùng nội dung với XPath đã cho trong vòng 10 giây.', image: null });
        }
        
        // Get the element handle using a reliable method
        const elementHandle = await page.evaluateHandle(
            xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
            xpathExpression
        );

        if (!elementHandle.asElement()) {
            return res.json({ found: false, message: 'Đã tìm thấy nhưng không thể lấy được vùng nội dung. XPath có thể không trỏ đến một phần tử hợp lệ.', image: null });
        }

        // Take a screenshot of the element
        const imageBuffer = await elementHandle.screenshot({ encoding: 'base64' });

        // Get all links within the element
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
                allLinks: allLinks
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
