const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');

// === PUBLIC ROUTE ===
// This route is NOT protected by authMiddleware
// GET /api/tags/public/:projectId.js - Lấy file script công khai
router.get('/public/:projectId.js', async (req, res) => {
    const { projectId } = req.params;
    try {
        const { data: tags, error } = await supabase
            .from('tags')
            .select('content')
            .eq('project_id', projectId)
            .eq('is_active', true);

        if (error) throw error;

        const combinedScript = tags.map(tag => `/* -- Tag Start -- */\n${tag.content}\n/* -- Tag End -- */`).join('\n\n');
        
        res.setHeader('Content-Type', 'application/javascript');
        res.send(combinedScript);

    } catch (error) {
        res.status(500).send(`/* Error fetching tags: ${error.message} */`);
    }
});


// === PROTECTED MANAGEMENT ROUTES ===
// All routes below this line are protected
router.use(authMiddleware);

// GET /api/tags?projectId=... - Lấy danh sách tags của một dự án
router.get('/', async (req, res) => {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'Project ID is required.' });

    try {
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tags - Tạo tag mới
router.post('/', async (req, res) => {
    const { project_id, name, content } = req.body;
    try {
        const { data, error } = await supabase
            .from('tags')
            .insert({ project_id, name, content, user_id: req.user.id })
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/tags/:id - Cập nhật tag
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, content, is_active } = req.body;
    try {
        const { data, error } = await supabase
            .from('tags')
            .update({ name, content, is_active })
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/tags/:id - Xóa tag
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
