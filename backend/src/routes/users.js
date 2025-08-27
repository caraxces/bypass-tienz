const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/users - Lấy danh sách tất cả người dùng (chỉ Admin)
router.get('/', async (req, res) => {
    try {
        const { data: users, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        // Lấy thông tin profiles và roles tương ứng
        const userIds = users.users.map(u => u.id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role_id, role:roles(id, name)')
            .in('id', userIds);
        if (profileError) throw profileError;

        const profilesMap = new Map(profiles.map(p => [p.id, p]));

        const combinedUsers = users.users.map(user => {
            const profile = profilesMap.get(user.id);
            return {
                id: user.id,
                email: user.email,
                full_name: profile?.full_name || 'N/A',
                role_id: profile?.role_id || null,
                role_name: profile?.role?.name || 'Chưa có',
                created_at: user.created_at,
            };
        });

        res.json(combinedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/:id/role - Cập nhật vai trò của người dùng (chỉ Admin)
router.put('/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role_id } = req.body;

    if (!role_id) {
        return res.status(400).json({ error: 'Role ID is required.' });
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role_id: role_id })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
