let lastUsage = 0;
let lastFetched = Date.now();

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

function msToHms(duration) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)));
  return `${hours}h ${minutes}m ${seconds}s`;
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
          <img src="${getIconForDomain(site)}" width="28" height="28"
               class="usage-img" data-site="${site}" />
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


function updateTime() {
  chrome.runtime.sendMessage({ type: 'getDashboardData' }, (data) => {
    lastUsage = data.dailyUsage || 0;
    lastFetched = Date.now();
    document.getElementById('totalTime').textContent = msToHms(lastUsage);
    renderSiteUsage(data.browsingHistory);
  });
}

function startLiveTimer() {
  setInterval(() => {
    let now = Date.now();
    let elapsed = now - lastFetched;
    document.getElementById('totalTime').textContent = msToHms(lastUsage + elapsed);
  }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  updateTime();
  startLiveTimer();

  // Open Dashboard Button
  const dashboardBtn = document.getElementById('openDashboard');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      const url = chrome.runtime.getURL('dashboard.html');
      chrome.tabs.create({ url });
    });
  }

  // Phishing Test Button
  const testBtn = document.getElementById('testPhishingBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url || '';
      const resultDiv = document.getElementById('phishingResult');
      if (!isTrackableUrl(url)) {
        resultDiv.innerHTML = '<span style="color:#e53e3e;">Cannot analyze this page.</span>';
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'analyze_page' }, response => {
        if (chrome.runtime.lastError) {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">Error: Content script not available</span>';
          return;
        }
        if (response?.score !== undefined) {
          let verdict = '';
          if (response.score > 0.8) {
            verdict = `<span style="color:#e53e3e;font-weight:bold;">Phishing Detected! (Score: ${(response.score * 100).toFixed(1)}%)</span>`;
          } else {
            verdict = `<span style="color:#38a169;font-weight:bold;">Safe (Score: ${(response.score * 100).toFixed(1)}%)</span>`;
          }
          resultDiv.innerHTML = verdict;
        } else {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">Feature extraction failed or incomplete!</span>';
        }
      });
    });
  }
});
