const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/roles - Lấy danh sách tất cả các vai trò
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*');

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
