const supabase = require('../supabaseClient');

const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        // 1. Fetch user's profile to get their role_id
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role_id')
            .eq('id', req.user.id)
            .single();

        if (profileError || !profile) {
            return res.status(403).json({ error: 'User profile not found.' });
        }

        // 2. Fetch the role name from roles table
        const { data: role, error: roleError } = await supabase
            .from('roles')
            .select('name')
            .eq('id', profile.role_id)
            .single();

        if (roleError || !role) {
            return res.status(403).json({ error: 'User role not found.' });
        }

        // 3. Check if the role is 'Admin' (case-insensitive)
        if (role.name.toLowerCase() !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required.' });
        }

        // If all checks pass, proceed to the next middleware/route handler
        next();

    } catch (error) {
        res.status(500).json({ error: 'Internal server error during authorization.' });
    }
};

module.exports = adminMiddleware;
