const express = require('express');
const router = express.Router();
const db = require('../db/database');

// middleware — تحقق أن المشرف مسجل دخول
function requireAuth(req, res, next) {
    if (!req.session.supervisor) {
        return res.status(401).json({ error: 'سجّل دخول أولاً' });
    }
    next();
}

// POST /api/attendance/scan
router.post('/scan', requireAuth, (req, res) => {
    const { token, session_id } = req.body;

    if (!token || !session_id) {
        return res.status(400).json({ error: 'token و session_id مطلوبان' });
    }

    // ١. ابحث عن الطالب بالـ token
    const student = db.prepare(`
    SELECT * FROM students WHERE qr_token = ?
  `).get(token);

    if (!student) {
        return res.status(404).json({ error: 'QR غير معروف' });
    }

    // ٢. تحقق أن سجل الحضور موجود لهذه الجلسة
    const record = db.prepare(`
    SELECT * FROM attendance
    WHERE session_id = ? AND student_id = ?
  `).get(session_id, student.id);

    if (!record) {
        return res.status(404).json({ error: 'الطالب غير مسجل في هذه الجلسة' });
    }

    // ٣. تحقق أن لم يُسجَّل مسبقاً
    if (record.is_present === 1) {
        return res.status(409).json({
            error: 'تم تسجيل هذا الطالب مسبقاً',
            student: student.name,
            scanned_at: record.scanned_at
        });
    }

    // ٤. سجّل الحضور
    db.prepare(`
    UPDATE attendance
    SET is_present  = 1,
        scanned_at  = datetime('now', '+3 hours'),
        scanned_by  = ?
    WHERE session_id = ? AND student_id = ?
  `).run(req.session.supervisor.id, session_id, student.id);

    res.json({
        message: 'تم تسجيل الحضور',
        student: student.name,
        scanned_by: req.session.supervisor.name
    });
});

module.exports = router;