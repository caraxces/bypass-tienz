const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET all projects for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new project for the authenticated user
router.post('/', async (req, res) => {
  const { name, website_url, slug, language, country, device } = req.body;
  if (!name || !website_url) {
    return res.status(400).json({ error: 'Project name and website URL are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        website_url,
        slug,
        language,
        country,
        device,
        user_id: req.user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- KEYWORD ROUTES FOR A SPECIFIC PROJECT ---

// GET /api/projects/:projectId/keywords - Lấy danh sách từ khóa của dự án
router.get('/:projectId/keywords', async (req, res) => {
    const { projectId } = req.params;
    try {
        // Lấy keywords của project với thông tin rank mới nhất
        const { data: keywords, error: keywordsError } = await supabase
            .from('keywords')
            .select('id, keyword_text, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (keywordsError) throw keywordsError;

        // Nếu không có keywords, trả về mảng rỗng
        if (!keywords || keywords.length === 0) {
            return res.json([]);
        }

        // Lấy rank mới nhất cho mỗi keyword
        const keywordsWithRanks = await Promise.all(
            keywords.map(async (keyword) => {
                try {
                    const { data: latestRank, error: rankError } = await supabase
                        .from('rankings')
                        .select('rank, checked_at')
                        .eq('keyword_id', keyword.id)
                        .order('checked_at', { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        id: keyword.id,
                        keyword_text: keyword.keyword_text,
                        latest_rank: latestRank ? latestRank.rank : null,
                        last_checked: latestRank ? latestRank.checked_at : null,
                        created_at: keyword.created_at
                    };
                } catch (rankError) {
                    // Nếu không có rank, trả về keyword không có rank
                    return {
                        id: keyword.id,
                        keyword_text: keyword.keyword_text,
                        latest_rank: null,
                        last_checked: null,
                        created_at: keyword.created_at
                    };
                }
            })
        );

        res.json(keywordsWithRanks);
    } catch (error) {
        console.error('Error fetching project keywords:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/projects/:projectId/keywords - Thêm từ khóa mới
router.post('/:projectId/keywords', async (req, res) => {
    const { projectId } = req.params;
    const { keyword_text } = req.body;
    if (!keyword_text) return res.status(400).json({ error: 'Keyword text is required.' });

    try {
        const { data, error } = await supabase
            .from('keywords')
            .insert({ project_id: projectId, keyword_text, user_id: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
