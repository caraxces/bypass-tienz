const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const puppeteer = require('puppeteer');
const { URL } = require('url');

// Biến cục bộ để theo dõi trạng thái cào (đơn giản hóa, không dùng cho production quy mô lớn)
// Trong thực tế nên dùng Redis hoặc DB để quản lý trạng thái này
const activeCrawls = new Map();

// GET /api/crawl - Lấy lịch sử các phiên cào của user
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('crawls')
            .select(`
                id,
                start_url,
                status,
                created_at,
                finished_at,
                crawled_pages ( count )
            `)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(20); // Giới hạn 20 lần cào gần nhất

        if (error) throw error;

        // Định dạng lại dữ liệu trả về cho gọn
        const history = data.map(crawl => ({
            ...crawl,
            pages_crawled: crawl.crawled_pages[0]?.count || 0,
            crawled_pages: undefined // Xóa trường thừa
        }));

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * Hàm cào chính, chạy ngầm
 */
async function runCrawler(crawlId, startUrl, userId) {
    console.log(`[${crawlId}] Starting crawl for: ${startUrl}`);
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    const domain = new URL(startUrl).hostname;
    const visited = new Set();
    const queue = new Set([startUrl]);
    let pagesCrawled = 0;
    const MAX_PAGES = 10000;

    // Cập nhật trạng thái trong DB
    await supabase.from('crawls').update({ status: 'running' }).eq('id', crawlId);
    activeCrawls.set(crawlId, true);

    try {
        for (let url of queue) {
            if (!activeCrawls.get(crawlId)) {
                console.log(`[${crawlId}] Crawl manually stopped.`);
                await supabase.from('crawls').update({ status: 'stopped', finished_at: new Date() }).eq('id', crawlId);
                break;
            }

            if (pagesCrawled >= MAX_PAGES || visited.has(url)) {
                continue;
            }

            console.log(`[${crawlId}] Crawling: ${url}`);
            visited.add(url);
            pagesCrawled++;

            try {
                const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                const statusCode = response.status();
                
                const data = await page.evaluate(() => {
                    const title = document.querySelector('title')?.innerText || null;
                    const meta_description = document.querySelector('meta[name="description"]')?.content || null;
                    const h1 = document.querySelector('h1')?.innerText || null;
                    const canonical_url = document.querySelector('link[rel="canonical"]')?.href || null;
                    const word_count = document.body.innerText.split(/\s+/).length;
                    
                    const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.href);
                    return { title, meta_description, h1, canonical_url, word_count, links };
                });

                // Lọc và thêm link mới vào hàng đợi
                const internalLinks = new Set();
                data.links.forEach(link => {
                    try {
                        const linkUrl = new URL(link, startUrl);
                        if (linkUrl.hostname === domain && !visited.has(linkUrl.href)) {
                            internalLinks.add(linkUrl.href);
                            queue.add(linkUrl.href);
                        }
                    } catch (e) { /* Bỏ qua link không hợp lệ */ }
                });

                // Lưu kết quả vào DB
                await supabase.from('crawled_pages').insert({
                    crawl_id: crawlId,
                    url: url,
                    status_code: statusCode,
                    title: data.title,
                    meta_description: data.meta_description,
                    h1: data.h1,
                    word_count: data.word_count,
                    canonical_url: data.canonical_url,
                    found_links: Array.from(internalLinks)
                });

            } catch (error) {
                console.error(`[${crawlId}] Failed to crawl ${url}: ${error.message}`);
                 await supabase.from('crawled_pages').insert({
                    crawl_id: crawlId,
                    url: url,
                    status_code: 500,
                    title: `Crawl Error: ${error.message}`
                });
            }
        }

        if (activeCrawls.get(crawlId)) {
             await supabase.from('crawls').update({ status: 'completed', finished_at: new Date() }).eq('id', crawlId);
             console.log(`[${crawlId}] Crawl completed. Total pages: ${pagesCrawled}`);
        }

    } catch (error) {
        console.error(`[${crawlId}] A critical error occurred: ${error.message}`);
        await supabase.from('crawls').update({ status: 'failed', finished_at: new Date() }).eq('id', crawlId);
    } finally {
        await browser.close();
        activeCrawls.delete(crawlId);
    }
}


// POST /api/crawl/start - Bắt đầu một phiên cào mới
router.post('/start', async (req, res) => {
    const { startUrl } = req.body;
    const userId = req.user.id;

    if (!startUrl) {
        return res.status(400).json({ error: 'startUrl is required' });
    }

    try {
        const { data, error } = await supabase
            .from('crawls')
            .insert({ start_url: startUrl, user_id: userId, status: 'pending' })
            .select()
            .single();

        if (error) throw error;

        // Trả về ngay lập tức
        res.status(202).json({ message: 'Crawl started', crawl_id: data.id });
        
        // Kích hoạt hàm cào chạy ngầm
        runCrawler(data.id, startUrl, userId);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/crawl/status/:crawlId - Lấy trạng thái
router.get('/status/:crawlId', async (req, res) => {
    const { crawlId } = req.params;
    try {
        const { data: crawlStatus, error: crawlError } = await supabase
            .from('crawls')
            .select('status, finished_at')
            .eq('id', crawlId)
            .single();
        
        if (crawlError) throw crawlError;

        const { count, error: countError } = await supabase
            .from('crawled_pages')
            .select('*', { count: 'exact', head: true })
            .eq('crawl_id', crawlId);

        if (countError) throw countError;

        res.json({
            status: crawlStatus.status,
            pagesCrawled: count,
            isFinished: ['completed', 'failed', 'stopped'].includes(crawlStatus.status),
            finished_at: crawlStatus.finished_at
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/crawl/results/:crawlId - Lấy kết quả
router.get('/results/:crawlId', async (req, res) => {
    const { crawlId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    try {
        const { data, error, count } = await supabase
            .from('crawled_pages')
            .select('*', { count: 'exact' })
            .eq('crawl_id', crawlId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        
        res.json({
            results: data,
            total: count,
            page,
            limit
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/crawl/stop/:crawlId - Dừng một phiên cào
router.post('/stop/:crawlId', async (req, res) => {
    const { crawlId } = req.params;
    if (activeCrawls.has(crawlId)) {
        activeCrawls.set(crawlId, false); // Gửi tín hiệu dừng
        res.status(200).json({ message: 'Crawl stopping signal sent.' });
    } else {
        res.status(404).json({ message: 'Crawl not found or already finished.' });
    }
});


module.exports = router;
