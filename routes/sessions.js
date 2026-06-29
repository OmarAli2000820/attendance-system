const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/sessions — إنشاء جلسة جديدة
router.post('/', (req, res) => {
    const { title, date } = req.body;

    // ١. تحقق من البيانات
    if (!title || !date) {
        return res.status(400).json({ error: 'title و date مطلوبان' });
    }

    // ٢. أنشئ الجلسة
    const session = db.prepare(`
    INSERT INTO sessions (title, date)
    VALUES (?, ?)
  `).run(title, date);

    const sessionId = session.lastInsertRowid;

    // ٣. جلب كل الطلبة
    const students = db.prepare('SELECT id FROM students').all();

    // ٤. إنشاء سجل attendance لكل طالب (is_present = 0)
    const insertAttendance = db.prepare(`
    INSERT INTO attendance (session_id, student_id, is_present)
    VALUES (?, ?, 0)
  `);

    for (const student of students) {
        insertAttendance.run(sessionId, student.id);
    }

    res.status(201).json({
        message: 'تم إنشاء الجلسة',
        session_id: sessionId,
        title,
        date,
        students_count: students.length
    });
});

// GET /api/sessions — عرض كل الجلسات
router.get('/', (req, res) => {
    const sessions = db.prepare('SELECT * FROM sessions').all();
    res.json(sessions);
});

// GET /api/sessions/:id — تفاصيل جلسة مع قائمة الحضور
router.get('/:id', (req, res) => {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?')
        .get(req.params.id);

    if (!session) {
        return res.status(404).json({ error: 'الجلسة غير موجودة' });
    }

    const attendance = db.prepare(`
    SELECT s.name, s.qr_token, a.is_present, a.scanned_at, a.scanned_by
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    WHERE a.session_id = ?
  `).all(req.params.id);

    res.json({ session, attendance });
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM attendance WHERE session_id = ?').run(req.params.id);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم حذف الجلسة' });
});

module.exports = router;