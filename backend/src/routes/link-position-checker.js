const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JSDOM } = require('jsdom');

router.post('/check', async (req, res) => {
    const { pageUrl, targetLink, xpathExpression } = req.body;

    if (!pageUrl || !targetLink || !xpathExpression) {
        return res.status(400).json({ error: 'Page URL, target link, and XPath expression are required.' });
    }

    try {
        const { data: htmlContent } = await axios.get(pageUrl);
        const dom = new JSDOM(htmlContent, { url: pageUrl });
        const document = dom.window.document;

        const containerNodes = [];
        const xpathResult = document.evaluate(xpathExpression, document, null, dom.window.XPathResult.ANY_TYPE, null);
        
        let node = xpathResult.iterateNext();
        while (node) {
            containerNodes.push(node);
            node = xpathResult.iterateNext();
        }

        if (containerNodes.length === 0) {
            return res.json({ found: false, message: 'Không tìm thấy vùng nội dung với XPath đã cho.' });
        }

        const allLinksInContainer = [];
        containerNodes.forEach(container => {
            const links = container.querySelectorAll('a');
            links.forEach(link => allLinksInContainer.push(link.href));
        });

        const targetLinkAbsolute = new dom.window.URL(targetLink, pageUrl).href;
        
        const linkIndex = allLinksInContainer.findIndex(href => href === targetLinkAbsolute);

        if (linkIndex !== -1) {
            res.json({
                found: true,
                position: linkIndex + 1,
                totalLinks: allLinksInContainer.length
            });
        } else {
            res.json({
                found: false,
                message: `Không tìm thấy link trong vùng nội dung. Tổng số link trong vùng: ${allLinksInContainer.length}.`
            });
        }

    } catch (error) {
        if (error.response) {
            return res.status(500).json({ error: `Không thể tải URL. Status code: ${error.response.status}` });
        }
        res.status(500).json({ error: 'Đã xảy ra lỗi khi phân tích trang.', details: error.message });
    }
});

module.exports = router;
