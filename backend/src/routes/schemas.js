const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const axios = require('axios');
const { JSDOM } = require('jsdom');

// GET /api/schemas - Lấy danh sách templates
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('schema_templates')
            .select('id, name, created_at')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/schemas - Tạo template mới
router.post('/', async (req, res) => {
    const { name, container_xpath, fields } = req.body;
    if (!name || !container_xpath || !fields || !Array.isArray(fields) || fields.length === 0) {
        return res.status(400).json({ error: 'Name, container_xpath, and at least one field are required.' });
    }

    try {
        // Bắt đầu một transaction
        const { data: template, error: templateError } = await supabase
            .from('schema_templates')
            .insert({ name, container_xpath, user_id: req.user.id })
            .select()
            .single();
        if (templateError) throw templateError;

        const fieldsToInsert = fields.map((field, index) => ({
            template_id: template.id,
            field_name: field.name,
            field_xpath: field.xpath,
            order: index,
            user_id: req.user.id,
        }));

        const { error: fieldsError } = await supabase.from('schema_template_fields').insert(fieldsToInsert);
        if (fieldsError) {
            // Nếu lỗi, xóa template đã tạo
            await supabase.from('schema_templates').delete().eq('id', template.id);
            throw fieldsError;
        }

        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/schemas/:id - Lấy chi tiết một template
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('schema_templates')
            .select('*, fields:schema_template_fields(*, order by: order)')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Template not found' });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/schemas/:id - Cập nhật template
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, container_xpath, fields } = req.body;

    try {
        // Update the main template info
        const { error: templateUpdateError } = await supabase
            .from('schema_templates')
            .update({ name, container_xpath })
            .eq('id', id)
            .eq('user_id', req.user.id);
        if (templateUpdateError) throw templateUpdateError;

        // Delete old fields
        const { error: deleteError } = await supabase
            .from('schema_template_fields')
            .delete()
            .eq('template_id', id);
        if (deleteError) throw deleteError;

        // Insert new fields
        const fieldsToInsert = fields.map((field, index) => ({
            template_id: id,
            field_name: field.name,
            field_xpath: field.xpath,
            order: index,
            user_id: req.user.id,
        }));
        const { error: insertError } = await supabase.from('schema_template_fields').insert(fieldsToInsert);
        if (insertError) throw insertError;

        res.status(200).json({ message: 'Template updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/schemas/:id - Xóa template
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('schema_templates')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/schemas/execute - Thực thi trích xuất
router.post('/execute', async (req, res) => {
    const { url, templateId } = req.body;
    if (!url || !templateId) {
        return res.status(400).json({ error: 'URL and Template ID are required.' });
    }

    try {
        // 1. Lấy thông tin template và các trường của nó
        const { data: template, error: templateError } = await supabase
            .from('schema_templates')
            .select('*, fields:schema_template_fields(*)')
            .eq('id', templateId)
            .eq('user_id', req.user.id)
            .single();
        if (templateError || !template) return res.status(404).json({ error: 'Template not found.' });

        // 2. Tải nội dung HTML từ URL
        const { data: htmlContent } = await axios.get(url);
        const dom = new JSDOM(htmlContent, { url });
        const document = dom.window.document;

        // 3. Tìm tất cả các vùng chứa (container)
        const containerNodes = [];
        const xpathResult = document.evaluate(template.container_xpath, document, null, dom.window.XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let containerNode = xpathResult.iterateNext();
        while (containerNode) {
            containerNodes.push(containerNode);
            containerNode = xpathResult.iterateNext();
        }

        // 4. Trích xuất dữ liệu từ mỗi vùng chứa
        const extractedData = [];
        for (const container of containerNodes) {
            const row = {};
            for (const field of template.fields) {
                const fieldResult = document.evaluate(field.field_xpath, container, null, dom.window.XPathResult.STRING_TYPE, null);
                row[field.field_name] = fieldResult.stringValue.trim();
            }
            extractedData.push(row);
        }

        res.json({
            headers: template.fields.map(f => f.field_name),
            data: extractedData,
        });

    } catch (error) {
        res.status(500).json({ error: 'Extraction failed.', details: error.message });
    }
});


module.exports = router;
