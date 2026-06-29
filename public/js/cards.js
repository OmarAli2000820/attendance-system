// تحقق من الجلسة
async function checkAuth() {
    const res = await fetch('/api/supervisors/me');
    if (res.status === 401) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

async function loadCards() {
    const res = await fetch('/api/students');
    if (res.status === 401) {
        window.location.href = '/login.html';
        return;
    }
    const students = await res.json();
    const container = document.getElementById('cards');

    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'card';

        const qrDiv = document.createElement('div');
        card.appendChild(qrDiv);

        const name = document.createElement('h3');
        name.textContent = student.name;
        card.appendChild(name);

        const token = document.createElement('p');
        token.textContent = student.qr_token.slice(0, 8) + '...';
        card.appendChild(token);

        container.appendChild(card);

        // توليد QR من الـ token
        new QRCode(qrDiv, {
            text: student.qr_token,
            width: 128,
            height: 128
        });
    });
}

checkAuth().then(ok => { if (ok) loadCards(); });