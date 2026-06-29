/* ── Auth ── */
async function checkAuth() {
    const r = await fetch("/api/supervisors/me");
    if (r.status === 401) { window.location.href = "/page/login.html"; return false; }
    const d = await r.json();
    document.getElementById("sup-name").textContent = d.name;
    return true;
}

/* ── Toast ── */
let toastTimer;
function toast(msg, type = "success") {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "show " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ""; }, 3500);
}

/* ── Panel navigation ── */
const panelTitles = { sessions: "الجلسات", students: "الطلبة", supervisors: "المشرفون" };

function showPanel(name) {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.getElementById("panel-" + name).classList.add("active");
    const nb = document.getElementById("nav-" + name);
    if (nb) nb.classList.add("active");
    document.getElementById("page-title").textContent = panelTitles[name] || "";
    // sync bottom tab
    document.querySelectorAll(".mob-tab").forEach(t => t.classList.remove("active"));
    const mt = document.getElementById("mob-" + name);
    if (mt) mt.classList.add("active");
    if (name === "sessions") loadSessions();
    if (name === "students") loadStudents();
    if (name === "supervisors") loadSupervisors();
}

window.showPanel = showPanel;

/* ── Stats ── */
async function loadStats() {
    const [s1, s2, s3] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/students"),
        fetch("/api/supervisors")
    ]);
    const [sessions, students, sups] = await Promise.all([s1.json(), s2.json(), s3.json()]);
    document.getElementById("stat-sessions").textContent = Array.isArray(sessions) ? sessions.length : "—";
    document.getElementById("stat-students").textContent = Array.isArray(students) ? students.length : "—";
    document.getElementById("stat-sups").textContent = Array.isArray(sups) ? sups.length : "—";
}

/* ── Sessions ── */
async function loadSessions() {
    const res = await fetch("/api/sessions");
    const sessions = await res.json();
    const tbody = document.getElementById("sessions-tbody");
    if (!sessions.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:2rem;text-align:center;color:#64748b">لا توجد جلسات بعد</td></tr>';
        loadStats();
        return;
    }
    tbody.innerHTML = sessions.map(s =>
        `<tr>
            <td style="color:#64748b;font-size:12px">#${s.id}</td>
            <td style="font-weight:600">${s.title}</td>
            <td><span class="badge badge-blue">${s.date}</span></td>
            <td><button class="btn btn-ghost" style="font-size:12px;padding:4px 12px"
                onclick="viewSession(${s.id}, ${JSON.stringify(s.title)})">📊 عرض الحضور</button></td>
            <td><button class="btn btn-danger" style="font-size:12px;padding:4px 12px"
                onclick="deleteSession(${s.id})">🗑</button></td>
        </tr>`
    ).join("");
    loadStats();
}

window.loadSessions = loadSessions;

async function createSession() {
    const title = document.getElementById("sess-title").value.trim();
    const date = document.getElementById("sess-date").value;
    if (!title || !date) { toast("أدخل العنوان والتاريخ", "error"); return; }
    const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date })
    });
    const data = await res.json();
    if (res.ok) {
        toast("✓ تم إنشاء الجلسة — " + data.students_count + " طالب");
        document.getElementById("sess-title").value = "";
        loadSessions();
    } else {
        toast(data.error || "حدث خطأ", "error");
    }
}

window.createSession = createSession;

async function deleteSession(id) {
    if (!confirm("هل تريد حذف هذه الجلسة وسجلات حضورها؟")) return;
    const res = await fetch("/api/sessions/" + id, { method: "DELETE" });
    if (res.ok) { toast("تم حذف الجلسة"); loadSessions(); }
    else toast("حدث خطأ", "error");
}

window.deleteSession = deleteSession;

/* ── Session modal ── */
async function viewSession(id, title) {
    const res = await fetch("/api/sessions/" + id);
    const data = await res.json();
    const att = data.attendance || [];
    const present = att.filter(a => a.is_present).length;
    const total = att.length;
    const pct = total ? Math.round(present / total * 100) : 0;

    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-stats").innerHTML =
        `<div class="att-stat"><div class="num" style="color:#10b981">${present}</div><div class="lbl">حضر</div></div>
         <div class="att-stat"><div class="num" style="color:#ef4444">${total - present}</div><div class="lbl">غاب</div></div>
         <div class="att-stat"><div class="num" style="color:#3b82f6">${pct}%</div><div class="lbl">نسبة الحضور</div></div>`;
    document.getElementById("modal-progress").style.width = pct + "%";
    document.getElementById("modal-tbody").innerHTML = att.map(a =>
        `<tr style="border-bottom:1px solid #ffffff12">
            <td style="padding:.65rem .875rem">${a.name}</td>
            <td style="padding:.65rem .875rem">${a.is_present
            ? '<span class="badge badge-green">✓ حاضر</span>'
            : '<span class="badge" style="background:rgba(239,68,68,.12);color:#ef4444">✗ غائب</span>'}</td>
            <td style="padding:.65rem .875rem;color:#64748b;font-size:12px">${a.scanned_at || "—"}</td>
        </tr>`
    ).join("");
    document.getElementById("session-modal").classList.add("open");
}

window.viewSession = viewSession;

function closeModal() {
    document.getElementById("session-modal").classList.remove("open");
}

window.closeModal = closeModal;

document.getElementById("session-modal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
});

/* ── Students ── */
async function loadStudents() {
    const res = await fetch("/api/students");
    const students = await res.json();
    const tbody = document.getElementById("students-tbody");
    if (!students.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:2rem;text-align:center;color:#64748b">لا يوجد طلبة — قم باستيراد CSV</td></tr>';
        return;
    }
    tbody.innerHTML = students.map(s =>
        `<tr>
            <td style="color:#64748b;font-size:12px">#${s.id}</td>
            <td style="font-weight:600">${s.name}</td>
            <td style="color:#64748b">${s.phone || "—"}</td>
            <td><code style="background:#22263a;padding:3px 8px;border-radius:5px;font-size:11px">${s.qr_token.slice(0, 12)}…</code></td>
            <td><button class="btn btn-danger" style="font-size:12px;padding:4px 12px"
                onclick="deleteStudent(${s.id}, '${s.name}')">🗑</button></td>
        </tr>`
    ).join("");
}

window.loadStudents = loadStudents;

async function deleteStudent(id, name) {
    if (!confirm(`هل تريد حذف الطالب "${name}" نهائياً؟\nسيتم حذف سجلات حضوره أيضاً.`)) return;
    const res = await fetch("/api/students/" + id, { method: "DELETE" });
    if (res.ok) { toast("✓ تم حذف " + name); loadStudents(); loadStats(); }
    else toast("حدث خطأ أثناء الحذف", "error");
}

window.deleteStudent = deleteStudent;

/* ── CSV upload ── */
let csvFile = null;
const uploadZone = document.getElementById("upload-zone");

uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", e => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    const f = e.dataTransfer.files[0];
    if (f) previewFile(f);
});

function previewCSV(input) { if (input.files[0]) previewFile(input.files[0]); }
window.previewCSV = previewCSV;

function previewFile(file) {
    csvFile = file;
    document.getElementById("csv-filename").textContent = file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.trim().split("\n").map(l => l.replace(/\r/g, ""));
        if (!lines.length) return;
        const headers = lines[0].split(",").map(h => h.trim());
        const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim()));
        document.getElementById("preview-head").innerHTML = headers.map(h =>
            `<th style="padding:.6rem .875rem;background:#22263a;text-align:right;font-size:11px;color:#64748b;border-bottom:1px solid #ffffff12">${h}</th>`
        ).join("");
        let bodyHtml = rows.slice(0, 20).map(row =>
            "<tr style=\"border-bottom:1px solid #ffffff12\">" +
            row.map(c => `<td style="padding:.6rem .875rem;font-size:.825rem">${c}</td>`).join("") +
            "</tr>"
        ).join("");
        if (rows.length > 20)
            bodyHtml += `<tr><td colspan="${headers.length}" style="padding:.6rem .875rem;text-align:center;color:#64748b;font-size:12px">... و ${rows.length - 20} صفاً آخر</td></tr>`;
        document.getElementById("preview-body").innerHTML = bodyHtml;
        document.getElementById("csv-preview").style.display = "block";
    };
    reader.readAsText(file, "utf-8");
}

function clearCSV() {
    csvFile = null;
    document.getElementById("csv-file").value = "";
    document.getElementById("csv-preview").style.display = "none";
}

window.clearCSV = clearCSV;

async function importCSV() {
    if (!csvFile) return;
    const btn = document.getElementById("btn-import");
    btn.textContent = "⏳ جارٍ الاستيراد...";
    btn.disabled = true;
    const form = new FormData();
    form.append("csv", csvFile);
    const res = await fetch("/api/students/import", { method: "POST", body: form });
    const data = await res.json();
    btn.textContent = "⬆ استيراد";
    btn.disabled = false;
    if (res.ok) {
        toast("✓ تم استيراد " + data.imported + " طالب — تخطي " + data.skipped);
        clearCSV();
        loadStudents();
        loadStats();
    } else {
        toast(data.error || "حدث خطأ", "error");
    }
}

window.importCSV = importCSV;

/* ── Supervisors ── */
async function loadSupervisors() {
    const res = await fetch("/api/supervisors");
    const sups = await res.json();
    const tbody = document.getElementById("supervisors-tbody");
    if (!sups.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:2rem;text-align:center;color:#64748b">لا يوجد مشرفون</td></tr>';
        return;
    }
    tbody.innerHTML = sups.map(s =>
        `<tr>
            <td style="color:#64748b;font-size:12px">#${s.id}</td>
            <td style="font-weight:600">${s.name}</td>
            <td><code style="background:#22263a;padding:3px 8px;border-radius:5px;font-size:13px">${s.username}</code></td>
            <td><button class="btn btn-danger" style="font-size:12px;padding:4px 12px"
                onclick="deleteSupervisor(${s.id})">🗑</button></td>
        </tr>`
    ).join("");
}

window.loadSupervisors = loadSupervisors;

async function addSupervisor() {
    const username = document.getElementById("sup-username").value.trim();
    const name = document.getElementById("sup-fullname").value.trim();
    const password = document.getElementById("sup-password").value.trim();
    if (!username || !name || !password) { toast("أكمل جميع الحقول", "error"); return; }
    const res = await fetch("/api/supervisors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, password })
    });
    const data = await res.json();
    if (res.ok) {
        toast("✓ تم إضافة المشرف");
        document.getElementById("sup-username").value = "";
        document.getElementById("sup-fullname").value = "";
        document.getElementById("sup-password").value = "";
        loadSupervisors();
        loadStats();
    } else {
        toast(data.error || "حدث خطأ", "error");
    }
}

window.addSupervisor = addSupervisor;

async function deleteSupervisor(id) {
    if (!confirm("هل تريد حذف هذا المشرف؟")) return;
    const res = await fetch("/api/supervisors/" + id, { method: "DELETE" });
    if (res.ok) { toast("تم حذف المشرف"); loadSupervisors(); loadStats(); }
    else toast("حدث خطأ", "error");
}

window.deleteSupervisor = deleteSupervisor;

/* ── Logout ── */
async function logout() {
    await fetch("/api/supervisors/logout", { method: "POST" });
    window.location.href = "/login.html";
}

window.logout = logout;

/* ── Mobile sidebar ── */
function toggleSidebar() {
    const sb = document.querySelector(".sidebar");
    const ov = document.getElementById("sidebar-overlay");
    const isOpening = !sb.classList.contains("open");
    sb.classList.toggle("open");
    ov.classList.toggle("open");
    document.body.classList.toggle("sidebar-locked", isOpening);
}

function closeSidebar() {
    document.querySelector(".sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("open");
    document.body.classList.remove("sidebar-locked");
}

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

/* ── Init ── */
document.getElementById("sess-date").value = new Date().toISOString().split("T")[0];
checkAuth().then(ok => {
    if (ok) {
        loadSessions();
        loadStats();
        document.getElementById("mob-sessions").classList.add("active");
    }
});