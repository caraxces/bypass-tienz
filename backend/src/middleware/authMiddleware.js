const supabase = require('../supabaseClient');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided or invalid format.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

module.exports = authMiddleware;
