const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// Đăng ký người dùng mới
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        
        // Không tự động đăng nhập sau khi đăng ký, yêu cầu xác thực email
        res.status(201).json({ message: 'Signup successful, please check your email for verification.' });
    
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Đăng nhập người dùng
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        const { access_token, refresh_token, user } = data.session;

        // Thiết lập HttpOnly cookie để bảo mật
        res.cookie('sb-access-token', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS ở môi trường production
            sameSite: 'lax',
            // domain: 'localhost', // Xóa dòng này, không cần thiết với proxy
            maxAge: 60 * 60 * 24 * 7 * 1000 // 7 ngày
        });
        
        res.cookie('sb-refresh-token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            // domain: 'localhost', // Xóa dòng này
            maxAge: 60 * 60 * 24 * 30 * 1000 // 30 ngày
        });
        
        res.status(200).json({ 
            message: 'Logged in successfully', 
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Đăng xuất người dùng
router.post('/logout', async (req, res) => {
    try {
        // Mặc dù chúng ta dùng cookie, vẫn nên gọi signOut của supabase để vô hiệu hóa token phía server
        // Tuy nhiên, việc này cần token, chúng ta sẽ xử lý ở middleware
        // Ở đây, chúng ta chỉ cần xóa cookie
        res.clearCookie('sb-access-token');
        res.clearCookie('sb-refresh-token');
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log out' });
    }
});

// Lấy thông tin người dùng hiện tại từ cookie
router.get('/me', async (req, res) => {
    const accessToken = req.cookies['sb-access-token'];

    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
