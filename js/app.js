// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onChildAdded } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// KONFIGURASI FIREBASE (GANTI DENGAN MILIK ANDA)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyA33zuH6Z7Qcv2EvkiGERzpWUcIdJmzd9Q",
    authDomain: "sistem-uks.firebaseapp.com",
    projectId: "sistem-uks",
    storageBucket: "sistem-uks.firebasestorage.app",
    messagingSenderId: "940843078950",
    appId: "1:940843078950:web:a3f3b2080ca8b513435de7",
    measurementId: "G-Z8GM9K5FWX"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    const healthChart = initHealthChart();

    let totalVisits = 0;
    let hrReadings = [];
    let spo2Readings = [];
    let successfulVerifications = 0;
    let totalAttempts = 0;
    let selectedDate = new Date(); 
    let isToday = true;

    const liveFeed = document.getElementById('liveFeed');
    const systemStatus = document.getElementById('systemStatus');
    const liveBadge = document.getElementById('liveBadge');
    const currentDateDisplay = document.getElementById('currentDateDisplay');
    const toastContainer = document.getElementById('toastContainer');
    
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // ==========================================
    // DATE NAVIGATION LOGIC
    // ==========================================
    function updateDateDisplay() {
        const dayName = dayNames[selectedDate.getDay()];
        const date = selectedDate.getDate();
        const month = monthNames[selectedDate.getMonth()];
        const year = selectedDate.getFullYear();
        currentDateDisplay.textContent = `${dayName}, ${date} ${month} ${year}`;

        const today = new Date();
        today.setHours(0,0,0,0);
        const selected = new Date(selectedDate);
        selected.setHours(0,0,0,0);
        nextDayBtn.disabled = (selected.getTime() >= today.getTime());
    }

    prevDayBtn.addEventListener('click', () => {
        selectedDate.setDate(selectedDate.getDate() - 1);
        isToday = false;
        updateDateDisplay();
        loadDataForDate();
    });

    nextDayBtn.addEventListener('click', () => {
        if (nextDayBtn.disabled) return;
        selectedDate.setDate(selectedDate.getDate() + 1);
        const today = new Date(); today.setHours(0,0,0,0);
        const selected = new Date(selectedDate); selected.setHours(0,0,0,0);
        isToday = (selected.getTime() === today.getTime());
        updateDateDisplay();
        loadDataForDate();
    });

    // ==========================================
    // FIREBASE LISTENER (REAL-TIME)
    // ==========================================
    function startFirebaseListener() {
        const visitsRef = ref(db, 'kunjungan');

        systemStatus.querySelector('.status-text').textContent = 'Terhubung ke Firebase';
        systemStatus.style.background = 'var(--accent-green-soft)';
        systemStatus.style.color = 'var(--accent-green)';

        onChildAdded(visitsRef, (snapshot) => {
            if (!isToday) return; 

            const data = snapshot.val();
            
            if (data && data.nama && data.hr && data.spo2) {
                showToast(data.nama, data.hr, data.spo2, data.waktu);
                processRealtimeData(data);
            }
        }, (error) => {
            console.error("Firebase Error:", error);
            systemStatus.querySelector('.status-text').textContent = 'Gagal Koneksi Firebase';
            systemStatus.style.background = 'var(--accent-red-soft)';
            systemStatus.style.color = 'var(--accent-red)';
        });
    }

    function processRealtimeData(data) {
        totalAttempts++;
        successfulVerifications++;
        totalVisits++;
        hrReadings.push(parseInt(data.hr));
        spo2Readings.push(parseInt(data.spo2));

        if (hrReadings.length > 10) { hrReadings.shift(); spo2Readings.shift(); }

        updateUI(data.nama, data.hr, data.spo2, true, true, data.waktu);
        updateStats();
        updateChart(hrReadings, spo2Readings);
    }

    // ==========================================
    // TOAST NOTIFICATION UI
    // ==========================================
    function showToast(name, hr, spo2, waktu) {
        const displayTime = waktu ? formatWaktu(waktu) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <div class="toast-icon"><i data-lucide="send"></i></div>
            <div class="toast-content">
                <div class="toast-title">Pesan Bot Telegram Masuk</div>
                <div class="toast-message">${name} terverifikasi. HR: ${hr} bpm, SpO₂: ${spo2}%<br><small style="opacity:0.7">Pukul ${displayTime}</small></div>
            </div>
        `;
        
        lucide.createIcons();
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    function formatWaktu(waktu) {
        if (!waktu) return '--:--:--';
        const date = new Date(waktu);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // ==========================================
    // DATA LOADING & UI UPDATES
    // ==========================================
    function loadDataForDate() {
        liveFeed.innerHTML = '';
        totalVisits = 0; hrReadings = []; spo2Readings = [];
        successfulVerifications = 0; totalAttempts = 0;

        if (isToday) {
            liveFeed.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><p>Menunggu data real-time dari Firebase...</p></div>`;
            lucide.createIcons();
            systemStatus.querySelector('.status-text').textContent = 'Mendengarkan Firebase...';
            systemStatus.style.background = 'var(--telegram-soft)';
            systemStatus.style.color = 'var(--telegram-color)';
            liveBadge.style.display = 'block';
            updateStats();
            updateChart([], []);
            
            startFirebaseListener();
        } else {
            // TAMPILAN UNTUK HARI SEBELUMNYA (TANPA DATA CONTOH)
            systemStatus.querySelector('.status-text').textContent = 'Melihat Data Historis';
            systemStatus.style.background = 'var(--accent-purple-soft)';
            systemStatus.style.color = 'var(--accent-purple)';
            liveBadge.style.display = 'none';
            
            liveFeed.innerHTML = `<div class="empty-state"><i data-lucide="calendar-x"></i><p>Tidak ada data kunjungan untuk tanggal ini.</p></div>`;
            lucide.createIcons();
            
            updateStats();
            updateChart([], []);
        }
    }

    function updateUI(name, hr, spo2, isVerified, isBotUpdate = false, waktu = null) {
        if (liveFeed.querySelector('.empty-state')) liveFeed.innerHTML = '';
        const feedItem = document.createElement('div');
        feedItem.className = `feed-item ${isBotUpdate ? 'bot-update' : ''}`;
        
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const displayTime = waktu ? formatWaktu(waktu) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        feedItem.innerHTML = `
            <div class="feed-avatar">${initials}</div>
            <div class="feed-details">
                <div class="feed-name">${name} ${isVerified ? '✓' : '✗'}</div>
                <div class="feed-meta">
                    ${isBotUpdate ? '<i data-lucide="send" style="width:12px;height:12px;color:var(--telegram-color)"></i> Via Bot Telegram' : 'Data Historis'} • ${displayTime}
                </div>
            </div>
            <div class="feed-vitals">
                <div class="vital-box"><span class="vital-label">HR</span><span class="vital-value hr">${hr}</span></div>
                <div class="vital-box"><span class="vital-label">SpO₂</span><span class="vital-value spo2">${spo2}%</span></div>
            </div>
        `;
        lucide.createIcons();
        liveFeed.insertBefore(feedItem, liveFeed.firstChild);
    }

    function updateStats() {
        document.getElementById('totalVisits').textContent = totalVisits;
        const avgHR = hrReadings.length ? Math.round(hrReadings.reduce((a, b) => a + b, 0) / hrReadings.length) : '--';
        const avgSpO2 = spo2Readings.length ? Math.round(spo2Readings.reduce((a, b) => a + b, 0) / spo2Readings.length) : '--';
        document.getElementById('avgHR').textContent = avgHR;
        document.getElementById('avgSpO2').textContent = avgSpO2;
        const rate = totalAttempts ? Math.round((successfulVerifications / totalAttempts) * 100) : 0;
        document.getElementById('successRate').textContent = `${rate}%`;
    }

    function initHealthChart() {
        const ctx = document.getElementById('healthChart').getContext('2d');
        const style = getComputedStyle(document.body);
        const colorBlue = style.getPropertyValue('--accent-blue').trim();
        const colorGreen = style.getPropertyValue('--accent-green').trim();
        const colorGrid = style.getPropertyValue('--glass-border').trim();
        const colorText = style.getPropertyValue('--text-muted').trim();

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(10).fill(''),
                datasets: [
                    { label: 'Heart Rate (bpm)', data: Array(10).fill(null), borderColor: colorBlue, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 2, tension: 0.4, fill: true, yAxisID: 'y' },
                    { label: 'SpO₂ (%)', data: Array(10).fill(null), borderColor: colorGreen, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, tension: 0.4, fill: true, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                plugins: { legend: { labels: { color: style.getPropertyValue('--text-secondary').trim() } } },
                scales: {
                    x: { grid: { color: colorGrid, drawBorder: false }, ticks: { color: colorText } },
                    y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'HR (bpm)', color: colorBlue }, grid: { color: colorGrid, drawBorder: false }, ticks: { color: colorText }, min: 50, max: 120 },
                    y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'SpO₂ (%)', color: colorGreen }, grid: { drawOnChartArea: false }, ticks: { color: colorText }, min: 90, max: 100 }
                }
            }
        });
    }

    function updateChart(hrData, spo2Data) {
        const padArray = (arr, len) => { const res = [...arr]; while (res.length < len) res.unshift(null); return res; };
        healthChart.data.datasets[0].data = padArray(hrData, 10);
        healthChart.data.datasets[1].data = padArray(spo2Data, 10);
        healthChart.update('none'); 
    }

    // Inisialisasi Awal
    updateDateDisplay();
    loadDataForDate(); 
});