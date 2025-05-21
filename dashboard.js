function msToHms(duration) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)));
  return `${hours}h ${minutes}m ${seconds}s`;
}

function isTrackableUrl(url) {
  if (!url) return false;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.includes(chrome.runtime.id) // your extension's own ID
  ) return false;
  return /^https?:\/\//.test(url);
}

const ICONS = {
  'youtube.com': 'https://play-lh.googleusercontent.com/lMoItBgdPPVDJsNOVtP26EKHePkwBg-PkuY9NOrc-fumRtTFP4XhpUNk_22syN4Datc',
  'github.com': 'https://play-lh.googleusercontent.com/PCpXdqvUWfCW1mXhH1Y_98yBpgsWxuTSTofy3NGMo9yBTATDyzVkqU580bfSln50bFU',
  'gmail.com': 'https://play-lh.googleusercontent.com/KSuaRLiI_FlDP8cM4MzJ23ml3og5Hxb9AapaGTMZ2GgR103mvJ3AAnoOFz1yheeQBBI',
  'whatsapp.com': 'https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN',
  'google.com': 'https://play-lh.googleusercontent.com/aFWiT2lTa9CYBpyPjfgfNHd0r5puwKRGj2rHpdPTNrz2N9LXgN_MbLjePd1OTc0E8Rl1',
  'facebook.com': 'icons/facebook.png',
  'instagram.com': 'icons/instagram.png',
  'twitter.com': 'icons/twitter-x.png',
  'linkedin.com': 'https://play-lh.googleusercontent.com/kMofEFLjobZy_bCuaiDogzBcUT-dz3BBbOrIEjJ-hqOabjK8ieuevGe6wlTD15QzOqw',
  'tiktok.com': 'icons/tiktok.png',
  'pinterest.com': 'https://play-lh.googleusercontent.com/dVsv8Hc4TOUeLFAahxR8KANg22W9dj2jBsTW1VHv3CV-5NCZjP9D9i2j5IpfVx2NTB8',
  'reddit.com': 'https://play-lh.googleusercontent.com/nlptFyxNsb8J0g8ZLux6016kunduV4jCxIrOJ7EEy-IobSN1RCDXAJ6DTGP81z7rr5Zq',
  "telegram.com": "https://play-lh.googleusercontent.com/ZU9cSsyIJZo6Oy7HTHiEPwZg0m2Crep-d5ZrfajqtsH-qgUXSqKpNA2FpPDTn-7qA5Q",
};

function fallbackIcons() {
  document.querySelectorAll('.usage-img').forEach(img => {
    img.addEventListener('error', function handler() {
      this.removeEventListener('error', handler);
      this.src = 'icons/default.jpg';
    });
  });
}

function getIconForDomain(domain) {
  for (const key in ICONS) {
    if (domain.endsWith(key)) return ICONS[key];
  }
  return 'icons/default.jpg'; // fallback
}

function renderSiteUsage(browsingHistory) {
  const list = document.getElementById('siteUsageList');
  if (!browsingHistory || Object.keys(browsingHistory).length === 0) {
    list.innerHTML = '<div style="color:#888;text-align:center;">No site usage data yet.</div>';
    return;
  }
  const filtered = Object.entries(browsingHistory)
    .filter(([site]) => isTrackableUrl('https://' + site))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (filtered.length === 0) {
    list.innerHTML = '<div style="color:#888;text-align:center;">No site usage data yet.</div>';
    return;
  }

  const max = filtered[0][1] || 1;
  let html = '';
  for (const [site, ms] of filtered) {
    const percent = Math.min(100, Math.round((ms / max) * 100));
    html += `
      <div class="usage-row">
        <div class="usage-icon">
          <img src="${getIconForDomain(site)}" width="28" height="28" class="usage-img" data-site="${site}" />
        </div>
        <div class="usage-details">
          <div class="usage-title">${site}</div>
          <div class="usage-bar-bg">
            <div class="usage-bar" style="width:${percent}%;background:${percent>=100?'#e53e3e':'linear-gradient(90deg,#63b3ed 0%,#3182ce 100%)'}"></div>
          </div>
        </div>
        <div class="usage-time">${msToHms(ms)}</div>
      </div>
    `;
  }
  list.innerHTML = html;
  fallbackIcons();
}

// Render daily and weekly bar charts using Chart.js
function renderBarCharts(dailyUsageData, weeklyUsageData) {
  // Load Chart.js dynamically if not loaded
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://.jsdelivr.net/npm/chart.js';
    script.onload = () => renderBarCharts(dailyUsageData, weeklyUsageData);
    document.head.appendChild(script);
    return;
  }

  // Destroy previous charts if they exist
  if (window.dailyChartInstance) window.dailyChartInstance.destroy();
  if (window.weeklyChartInstance) window.weeklyChartInstance.destroy();

  // Daily Usage Chart
  const dailyCtx = document.getElementById('dailyChart').getContext('2d');
  window.dailyChartInstance = new Chart(dailyCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Minutes',
        data: dailyUsageData,
        backgroundColor: '#3182ce'
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } }
    }
  });

  // Weekly Usage Chart
  const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
  window.weeklyChartInstance = new Chart(weeklyCtx, {
    type: 'bar',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
      datasets: [{
        label: 'Minutes',
        data: weeklyUsageData,
        backgroundColor: '#63b3ed'
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } }
    }
  });
}

function updateDashboard() {
  chrome.runtime.sendMessage({ type: 'getDashboardData' }, (data) => {
    document.getElementById('totalTime').textContent = msToHms(data.dailyUsage);

    let html = '';
    const sortedSites = Object.entries(data.browsingHistory || {})
      .sort((a, b) => b[1] - a[1]); // Sort by time spent, descending

    for (const [domain, ms] of sortedSites) {
      html += `<div><span style="color:#357ABD; font-weight:600;">${domain}</span><span>${msToHms(ms)}</span></div>`;
    }
    document.getElementById('sitesList').innerHTML = html || '<div style="color:#aaa;">No browsing activity yet today.</div>';
    renderSiteUsage(data.browsingHistory || {});

    // Example dummy data for charts (replace with real data if available)
    const dailyUsageData = [100, 90, 45, 90, 120, 80, 100];
    const weeklyUsageData = [300, 400, 350, 500, 600, 450, 480];
    renderBarCharts(dailyUsageData, weeklyUsageData);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  setInterval(updateDashboard, 1000);
});

document.addEventListener('DOMContentLoaded', () => {
  const logoImg = document.querySelector('.dashboard-icon img');
  if (logoImg) {
    logoImg.addEventListener('error', function handler() {
      this.style.display = 'none';
    });
  }
});
