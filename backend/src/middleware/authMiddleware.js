const supabase = require('../supabaseClient');

const authMiddleware = async (req, res, next) => {
    // DEBUG: Ghi log để kiểm tra cookie nhận được
    console.log(`[Auth Middleware] Path: ${req.path}`);
    console.log('[Auth Middleware] Cookies received:', req.cookies);

    // Lấy access token từ cookie
    const token = req.cookies['sb-access-token'];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required: No token provided.' });
    }

    try {
        // Xác thực token với Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error) {
            // Nếu access token hết hạn, thử làm mới nó
            if (error.message === 'invalid token' || error.message.includes('expired')) {
                 console.log('Access token expired, trying to refresh...');
                const refreshToken = req.cookies['sb-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({ error: 'Authentication required: No refresh token.' });
                }

                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

                if (refreshError) {
                    // Nếu refresh token cũng không hợp lệ, xóa cookie và yêu cầu đăng nhập lại
                    res.clearCookie('sb-access-token');
                    res.clearCookie('sb-refresh-token');
                    return res.status(401).json({ error: 'Session expired. Please log in again.' });
                }
                
                // Cập nhật cookie với token mới
                const { access_token: new_access_token, refresh_token: new_refresh_token } = refreshData.session;
                res.cookie('sb-access-token', new_access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
                res.cookie('sb-refresh-token', new_refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

                // Gắn thông tin người dùng vào request và tiếp tục
                req.user = refreshData.user;
                return next();
            }
            
            // Các lỗi token không hợp lệ khác
            return res.status(401).json({ error: `Authentication failed: ${error.message}` });
        }
        
        // Gắn thông tin người dùng vào request để các route sau có thể sử dụng
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};

module.exports = authMiddleware;
