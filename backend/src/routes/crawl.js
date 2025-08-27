const express = require('express');
const router = express.Router();
const axios = require('axios');
const { JSDOM } = require('jsdom');
const supabase = require('../supabaseClient');

const CRAWL_LIMIT = 10000;

// =================================================================
// Core Crawler Logic - This will run in the background
// =================================================================
const runCrawler = async (crawlId, startUrl) => {
  const urlsToCrawl = [startUrl];
  const crawledUrls = new Set();
  const domain = new URL(startUrl).hostname;

  try {
    // Update crawl status to 'running'
    await supabase.from('crawls').update({ status: 'running' }).eq('id', crawlId);

    while (urlsToCrawl.length > 0 && crawledUrls.size < CRAWL_LIMIT) {
      const currentUrl = urlsToCrawl.shift();

      if (crawledUrls.has(currentUrl)) {
        continue;
      }

      crawledUrls.add(currentUrl);
      console.log(`Crawling (${crawledUrls.size}/${CRAWL_LIMIT}): ${currentUrl}`);
      
      let pageDataToSave = {
        crawl_id: crawlId,
        url: currentUrl,
      };

      try {
        const response = await axios.get(currentUrl, { 
            headers: { 'User-Agent': 'TienzivenCrawlBot/1.0' },
            timeout: 5000 // 5 second timeout
        });

        const html = response.data;
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const title = document.querySelector('title')?.textContent || '';
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const h1 = document.querySelector('h1')?.textContent || '';
        const wordCount = document.body.textContent.trim().split(/\s+/).length;
        const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
        
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => {
            try {
                return new URL(a.getAttribute('href'), currentUrl).href;
            } catch (e) {
                return null;
            }
        }).filter(href => href && new URL(href).hostname === domain); // Only crawl internal links

        pageDataToSave = {
            ...pageDataToSave,
            status_code: response.status,
            title,
            meta_description: metaDescription,
            h1,
            word_count: wordCount,
            canonical_url: canonicalUrl,
            found_links: links
        };
        
        // Add new, uncrawled links to the queue
        links.forEach(link => {
            if (!crawledUrls.has(link)) {
                urlsToCrawl.push(link);
            }
        });

      } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            pageDataToSave.status_code = error.response.status;
          } else {
            pageDataToSave.status_code = 500; // Internal/network error
          }
      }
      
      // Save the result for the current page
      await supabase.from('crawled_pages').insert(pageDataToSave);
    }

    // Mark the crawl as completed
    await supabase.from('crawls').update({ status: 'completed', finished_at: new Date() }).eq('id', crawlId);
    console.log(`Crawl ${crawlId} completed. Total pages: ${crawledUrls.size}`);

  } catch (error) {
    console.error(`Error during crawl ${crawlId}:`, error);
    await supabase.from('crawls').update({ status: 'failed', finished_at: new Date() }).eq('id', crawlId);
  }
};


// =================================================================
// API Endpoints
// =================================================================

// POST /api/crawl/start - Immediately starts a crawl and returns ID
router.post('/start', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Start URL is required.' });
  }

  try {
    const { data: crawl, error: crawlError } = await supabase
      .from('crawls')
      .insert({ start_url: url, status: 'pending' })
      .select()
      .single();

    if (crawlError) throw crawlError;
    
    // Start the crawler in the background and DO NOT wait for it to finish
    runCrawler(crawl.id, url);

    res.status(202).json({ message: 'Crawl initiated successfully.', crawl_id: crawl.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate crawl.', details: error.message });
  }
});

// GET /api/crawl/status/:crawlId - Checks the status and progress of a crawl
router.get('/status/:crawlId', async (req, res) => {
    const { crawlId } = req.params;
    try {
        const { data: crawlStatus, error: crawlError } = await supabase
            .from('crawls')
            .select('status')
            .eq('id', crawlId)
            .single();

        if (crawlError) throw crawlError;

        const { count: pageCount, error: countError } = await supabase
            .from('crawled_pages')
            .select('*', { count: 'exact', head: true })
            .eq('crawl_id', crawlId);

        if (countError) throw countError;

        res.json({
            status: crawlStatus.status,
            pagesCrawled: pageCount
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to get crawl status.', details: error.message });
    }
});


// GET /api/crawl/results/:crawlId - Gets the results of a completed crawl with pagination
router.get('/results/:crawlId', async (req, res) => {
  const { crawlId } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '100', 10);
  const offset = (page - 1) * limit;

  try {
    const { data, error, count } = await supabase
      .from('crawled_pages')
      .select('*', { count: 'exact' })
      .eq('crawl_id', crawlId)
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No results found for this crawl ID.' });

    res.json({
      data,
      total: count,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching crawl results.', details: error.message });
  }
});


module.exports = router;
