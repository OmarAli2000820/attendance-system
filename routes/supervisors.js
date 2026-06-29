const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.post('/register', (req, res) => {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    try {
        db.prepare(`
      INSERT INTO supervisors (username, password, name)
      VALUES (?, ?, ?)
    `).run(username, password, name);

        res.status(201).json({ message: 'تم إنشاء المشرف' });
    } catch (e) {
        res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
    }
});

// POST /api/supervisors/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'username و password مطلوبان' });
    }

    const supervisor = db.prepare(`
    SELECT * FROM supervisors WHERE username = ? AND password = ?
  `).get(username, password);

    if (!supervisor) {
        return res.status(401).json({ error: 'بيانات غير صحيحة' });
    }

    req.session.supervisor = {
        id: supervisor.id,
        name: supervisor.name
    };

    res.json({ message: 'تم تسجيل الدخول', name: supervisor.name });
});

// POST /api/supervisors/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'تم تسجيل الخروج' });
});

// GET /api/supervisors/me — من أنا؟
router.get('/me', (req, res) => {
    if (!req.session.supervisor) {
        return res.status(401).json({ error: 'غير مسجل الدخول' });
    }
    res.json(req.session.supervisor);
});

// GET /api/supervisors — قائمة المشرفين
router.get('/', (req, res) => {
    const list = db.prepare('SELECT id, username, name FROM supervisors').all();
    res.json(list);
});

// DELETE /api/supervisors/:id
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM supervisors WHERE id = ?').run(req.params.id);
    res.json({ message: 'تم الحذف' });
});

module.exports = router;