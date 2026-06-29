import { BrowserMultiFormatReader } from "https://esm.sh/@zxing/browser@0.1.5";

const reader = new BrowserMultiFormatReader();
const logItems = [];
let controls = null;
let isScanning = false;
let audioCtx = null;

/* ── Auth ─────────────────────────────────── */
async function checkAuth() {
    const res = await fetch("/api/supervisors/me");
    if (res.status === 401) { window.location.href = "/login.html"; return false; }
    const d = await res.json();
    document.getElementById("sup-name").textContent = d.name;
    return true;
}

/* ── Sessions ─────────────────────────────── */
async function loadSessions() {
    const res = await fetch("/api/sessions");
    const data = await res.json();
    const sel = document.getElementById("session-select");
    data.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.title + " — " + s.date;
        sel.appendChild(opt);
    });
}

/* ── Live counter ──────────────────────────── */
async function refreshCounter(sessionId) {
    if (!sessionId) return;
    const res = await fetch("/api/sessions/" + sessionId);
    if (!res.ok) return;
    const data = await res.json();
    const att = data.attendance || [];
    const present = att.filter(a => a.is_present).length;
    const total = att.length;
    const absent = total - present;
    const pct = total ? Math.round(present / total * 100) : 0;
    document.getElementById("cnt-present").textContent = present;
    document.getElementById("cnt-absent").textContent = absent;
    document.getElementById("cnt-total").textContent = total;
    document.getElementById("cnt-pct").textContent = pct + "%";
    document.getElementById("cnt-fill").style.width = pct + "%";
    document.getElementById("counter-card").style.display = "flex";
}

window.onSessionChange = function () {
    const id = document.getElementById("session-select").value;
    if (id) refreshCounter(id);
    else document.getElementById("counter-card").style.display = "none";
};

/* ── Sound (Web Audio API) ─────────────────── */
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function beep(freq, duration, type = "sine", vol = 0.4) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) { }
}

function soundSuccess() { beep(880, 0.12, "sine", 0.35); setTimeout(() => beep(1108, 0.18, "sine", 0.3), 100); }
function soundDuplicate() { beep(440, 0.14, "triangle", 0.3); setTimeout(() => beep(380, 0.2, "triangle", 0.25), 130); }
function soundError() { beep(220, 0.35, "sawtooth", 0.3); }

/* ── Scanner ───────────────────────────────── */
window.startScan = async function () {
    if (!document.getElementById("session-select").value) {
        alert("اختر جلسة أولاً");
        return;
    }
    document.getElementById("btn-start").style.display = "none";
    document.getElementById("btn-stop").style.display = "inline-block";
    const video = document.getElementById("video");
    controls = await reader.decodeFromVideoDevice(undefined, video, async (result, err) => {
        if (result && !isScanning) {
            await sendScan(result.getText());
        }
    });
};

window.stopScan = function () {
    if (controls) controls.stop();
    controls = null;
    isScanning = false;
    document.getElementById("scanning-overlay").classList.remove("visible");
    document.getElementById("btn-start").style.display = "inline-block";
    document.getElementById("btn-stop").style.display = "none";
};

/* ── Send scan ─────────────────────────────── */
async function sendScan(token) {
    isScanning = true;
    document.getElementById("scanning-overlay").classList.add("visible");
    const sessionId = document.getElementById("session-select").value;
    let res, data;
    try {
        res = await fetch("/api/attendance/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, session_id: sessionId })
        });
        data = await res.json();
    } catch (e) {
        document.getElementById("scanning-overlay").classList.remove("visible");
        showResult("error", "✗", "خطأ في الاتصال", "تحقق من الشبكة");
        soundError();
        if (navigator.vibrate) navigator.vibrate(500);
        setTimeout(() => { isScanning = false; window.startScan(); }, 2500);
        return;
    }
    document.getElementById("scanning-overlay").classList.remove("visible");
    if (res.status === 401) { window.location.href = "/login.html"; return; }
    if (res.status === 200) {
        const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
        showResult("success", "✓", data.student, "سجّل: " + data.scanned_by + " • " + time);
        soundSuccess();
        if (navigator.vibrate) navigator.vibrate(150);
        addLog(data.student, "success");
        refreshCounter(sessionId);
    } else if (res.status === 409) {
        const prevTime = data.scanned_at ? " • " + data.scanned_at.slice(11, 16) : "";
        showResult("warning", "⚠", data.student, "مسجّل مسبقاً" + prevTime);
        soundDuplicate();
        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
    } else {
        const errMap = {
            "QR غير معروف": "رمز QR غير معرّف في النظام",
            "الطالب غير مسجل في هذه الجلسة": "الطالب غير مضاف لهذه الجلسة",
        };
        showResult("error", "✗", errMap[data.error] || data.error, "حاول مرة أخرى");
        soundError();
        if (navigator.vibrate) navigator.vibrate(500);
    }
    setTimeout(() => { isScanning = false; window.startScan(); }, 1800);
}

/* ── Show result ────────────────────────────── */
function showResult(type, icon, name, sub) {
    const el = document.getElementById("result");
    el.className = "result " + type;
    el.style.display = "block";
    document.getElementById("result-icon").textContent = icon;
    document.getElementById("result-name").textContent = name;
    document.getElementById("result-sub").textContent = sub;
}

/* ── Log ────────────────────────────────────── */
function addLog(name, type) {
    const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    logItems.unshift({ name, time });
    document.getElementById("log-count").textContent = logItems.length;
    const list = document.getElementById("log-list");
    list.innerHTML = logItems.map(i =>
        `<div class="log-item"><span class="log-name">${i.name}</span><span class="log-time">${i.time}</span></div>`
    ).join("");
}

/* ── Logout ─────────────────────────────────── */
window.logout = async function () {
    await fetch("/api/supervisors/logout", { method: "POST" });
    window.location.href = "/login.html";
};

/* ── Init ────────────────────────────────────── */
checkAuth().then(ok => { if (ok) loadSessions(); });