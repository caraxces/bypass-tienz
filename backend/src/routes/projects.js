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
        // Gọi hàm RPC đã tạo trong Supabase
        const { data, error } = await supabase.rpc('get_project_keywords_with_latest_rank', {
            project_id_param: projectId
        });

        if (error) throw error;

        // Dữ liệu trả về đã có đúng định dạng, không cần map lại
        res.json(data);
    } catch (error) {
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
