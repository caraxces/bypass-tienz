const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const authMiddleware = require('../middleware/authMiddleware');
const { Parser } = require('json2csv');
const multer = require('multer');
const csv = require('csv-parser');
const stream = require('stream');

// Cấu hình Multer để lưu file vào bộ nhớ
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, name, website_url')
            .eq('id', projectId)
            .single();

        if (projectError) throw projectError;

        const { data: keywordsData, error: keywordsError } = await supabase
            .from('keywords')
            .select('id, keyword_text, position, last_checked, created_at')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (keywordsError) throw keywordsError;

        // Chuẩn hóa tên trường 'position' thành 'latest_rank' để đồng bộ với frontend
        const keywords = keywordsData.map(kw => ({
            id: kw.id,
            keyword_text: kw.keyword_text,
            latest_rank: kw.position, // Đổi tên ở đây
            last_checked: kw.last_checked,
            created_at: kw.created_at,
        }));


        res.json({
            project: projectData,
            keywords: keywords
        });
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

// === API MỚI CHO VIỆC XUẤT CSV ===
router.get('/:projectId/keywords/export', authMiddleware, async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.id;

    try {
        // Bước 1: Lấy thông tin project và kiểm tra quyền sở hữu
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, user_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !projectData) {
            return res.status(404).json({ message: 'Không tìm thấy dự án hoặc bạn không có quyền truy cập.' });
        }

        // Bước 2: Lấy tất cả keywords của project
        const { data: keywords, error: keywordsError } = await supabase
            .from('keywords')
            .select('keyword_text, latest_rank, full_url, last_checked')
            .eq('project_id', projectId)
            .order('keyword_text', { ascending: true });

        if (keywordsError) {
            throw keywordsError;
        }

        if (!keywords || keywords.length === 0) {
            return res.status(404).json({ message: 'Dự án này không có từ khóa nào để xuất.' });
        }

        // Bước 3: Chuyển đổi dữ liệu JSON sang CSV
        const fields = [
            { label: 'Keyword', value: 'keyword_text' },
            { label: 'URL', value: 'full_url' },
            { label: 'Rank', value: 'latest_rank' },
            { label: 'Last Checked', value: 'last_checked' }
        ];
        const json2csvParser = new Parser({ fields, header: true });
        const csv = json2csvParser.parse(keywords);

        // Bước 4: Gửi file CSV về cho client
        res.header('Content-Type', 'text/csv');
        res.attachment(`keywords-export-${projectId}.csv`);
        res.send(csv);

    } catch (error) {
        console.error('Lỗi khi xuất file CSV:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});


// === API MỚI CHO VIỆC NHẬP CSV ===
router.post('/:projectId/keywords/import', authMiddleware, upload.single('file'), async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    if (!req.file) {
        return res.status(400).json({ message: 'Vui lòng tải lên một file CSV.' });
    }

    try {
        // Bước 1: Kiểm tra quyền sở hữu project
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('id, user_id')
            .eq('id', projectId)
            .eq('user_id', userId)
            .single();

        if (projectError || !projectData) {
            return res.status(404).json({ message: 'Không tìm thấy dự án hoặc bạn không có quyền truy cập.' });
        }

        // Bước 2: Lấy danh sách keywords hiện có để đối chiếu
        const { data: existingKeywords, error: fetchError } = await supabase
            .from('keywords')
            .select('id, keyword_text')
            .eq('project_id', projectId);

        if (fetchError) throw fetchError;

        const existingKeywordsMap = new Map(existingKeywords.map(kw => [kw.keyword_text.toLowerCase().trim(), kw.id]));
        
        const results = [];
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const keywordsToInsert = [];
        const keywordsToUpdate = [];

        bufferStream
            .pipe(csv({
                mapHeaders: ({ header }) => header.toLowerCase().trim() // Chuẩn hóa header
            }))
            .on('data', (row) => {
                const keyword = row.keyword;
                if (keyword) {
                    const normalizedKeyword = keyword.toLowerCase().trim();
                    const url = row.url || null;
                    const rank = row.rank ? parseInt(row.rank, 10) : null;

                    if (existingKeywordsMap.has(normalizedKeyword)) {
                        // Keyword đã tồn tại -> Cập nhật
                        const keywordId = existingKeywordsMap.get(normalizedKeyword);
                        keywordsToUpdate.push({
                            id: keywordId,
                            full_url: url,
                            latest_rank: rank,
                            last_checked: new Date().toISOString()
                        });
                    } else {
                        // Keyword mới -> Thêm
                        keywordsToInsert.push({
                            project_id: projectId,
                            keyword_text: keyword,
                            full_url: url,
                            latest_rank: rank,
                            last_checked: new Date().toISOString()
                        });
                    }
                }
            })
            .on('end', async () => {
                try {
                    let insertCount = 0;
                    let updateCount = 0;

                    // Thực hiện cập nhật hàng loạt
                    if (keywordsToUpdate.length > 0) {
                        const { count, error } = await supabase.from('keywords').upsert(keywordsToUpdate);
                        if (error) throw error;
                        updateCount = keywordsToUpdate.length;
                    }
                    
                    // Thực hiện chèn mới hàng loạt
                    if (keywordsToInsert.length > 0) {
                        const { error } = await supabase.from('keywords').insert(keywordsToInsert);
                        if (error) throw error;
                        insertCount = keywordsToInsert.length;
                    }

                    res.json({ message: `Nhập thành công! Đã thêm ${insertCount} từ khóa mới và cập nhật ${updateCount} từ khóa.` });

                } catch (dbError) {
                    console.error('Lỗi khi thao tác với database:', dbError);
                    res.status(500).json({ message: 'Lỗi khi lưu dữ liệu vào cơ sở dữ liệu.' });
                }
            });

    } catch (error) {
        console.error('Lỗi khi nhập file CSV:', error);
        res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
    }
});


module.exports = router;
