const express = require('express');
const router = express.Router();
const db = require('../db/database');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { randomUUID } = require('crypto');

// multer — تخزين في الذاكرة مؤقتاً
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/students/import  (multipart: field "csv")
router.post('/import', upload.single('csv'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'أرسل ملف CSV بحقل اسمه csv' });
    }

    let rows;
    try {
        rows = parse(req.file.buffer.toString('utf-8'), {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    } catch (e) {
        return res.status(400).json({ error: 'صيغة CSV غير صحيحة' });
    }

    const insert = db.prepare(`
    INSERT OR IGNORE INTO students (name, phone, qr_token)
    VALUES (?, ?, ?)
    `);

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
        const result = insert.run(row.name || '', row.phone || null, randomUUID());
        result.changes === 1 ? imported++ : skipped++;
    }

    res.json({ message: 'تم الاستيراد', imported, skipped });
});

// GET /api/students
router.get('/', (req, res) => {
    const students = db.prepare('SELECT * FROM students ORDER BY id').all();
    res.json(students);
});

router.delete('/:id', (req, res) => {
    const id = req.params.id;

    // احذف سجلات الحضور أولاً
    db.prepare('DELETE FROM attendance WHERE student_id = ?').run(id);
    db.prepare('DELETE FROM enrollments WHERE student_id = ?').run(id);

    // ثم احذف الطالب
    db.prepare('DELETE FROM students WHERE id = ?').run(id);

    res.json({ message: 'تم الحذف' });
});

module.exports = router;