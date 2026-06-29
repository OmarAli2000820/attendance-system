const express = require('express');
const session = require('express-session');
const db = require('./db/database');
const students = require('./routes/students');
const sessions = require('./routes/sessions');
const supervisors = require('./routes/supervisors');
const attendance = require('./routes/attendance');

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: 'attendance-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 4 * 60 * 60 * 1000 } // 4 ساعات ثم تنتهي الجلسة
}));

// Middleware — حماية صفحات HTML ما عدا login.html
app.use((req, res, next) => {
    const isHtmlPage = req.path.endsWith('.html') || req.path === '/';
    const isLoginPage = req.path === '/page/login.html';
    const isApi = req.path.startsWith('/api');

    if (isHtmlPage && !isLoginPage && !isApi) {
        if (!req.session.supervisor) {
            return res.redirect('/page/login.html');
        }
    }
    next();
});

app.use('/api/students', students);
app.use('/api/sessions', sessions);
app.use('/api/supervisors', supervisors);
app.use('/api/attendance', attendance);

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'النظام يعمل' });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server على http://localhost:3000');
});