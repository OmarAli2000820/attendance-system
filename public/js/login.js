// إذا كان مسجلاً بالفعل اذهب للوحة التحكم
fetch('/api/supervisors/me').then(r => {
    if (r.ok) window.location.href = '/page/admin.html';
});

async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('error');

    errorEl.style.display = 'none';

    const res = await fetch('/api/supervisors/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (res.ok) {
        window.location.href = '/page/admin.html';
    } else {
        errorEl.style.display = 'block';
    }
}

// تسجيل دخول بضغط Enter
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
});