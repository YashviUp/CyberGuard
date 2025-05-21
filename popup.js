let lastUsage = 0;
let lastFetched = Date.now();

function isTrackableUrl(url) {
  if (!url) return false;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.includes(chrome.runtime.id)
  ) return false;
  return /^https?:\/\//.test(url);
}

function msToHms(duration) {
  let seconds = Math.floor((duration / 1000) % 60);
  let minutes = Math.floor((duration / (1000 * 60)) % 60);
  let hours = Math.floor((duration / (1000 * 60 * 60)));
  return `${hours}h ${minutes}m ${seconds}s`;
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
          <img src="${getIconForDomain(site)}" width="34" height="34" class="usage-img" data-site="${site}" />
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
  const testBtn = document.getElementById('testPhishingBtn');
  const resultDiv = document.getElementById('phishingResult');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">No active tab found.</span>';
          console.log("No active tab found.");
          return;
        }
        const tab = tabs[0];
        const url = tab.url || '';
        console.log("Testing content script on tab:", tab.id, url);
        if (!/^https?:\/\//.test(url)) {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">Cannot analyze this page.</span>';
          console.log("Not a regular web page:", url);
          return;
        }
        chrome.tabs.sendMessage(tab.id, { action: 'analyze_page' }, (response) => {
          if (chrome.runtime.lastError) {
            resultDiv.innerHTML = '<span style="color:#e53e3e;">Error: Content script not available</span>';
            console.log("Content script not available:", chrome.runtime.lastError.message, "Tab:", tab.id, url);
            return;
          }
          if (response && response.score !== undefined) {
            let verdict = '';
            if (response.score > 0.98) {
              verdict = `<span style="color:#e53e3e;font-weight:bold;">Phishing Detected! (Score: ${(response.score * 100).toFixed(1)}%)</span>`;
            } else {
              verdict = `<span style="color:#38a169;font-weight:bold;">Safe (Score: ${(response.score * 100).toFixed(1)}%)</span>`;
            }
            resultDiv.innerHTML = verdict;
          } else {
            resultDiv.innerHTML = '<span style="color:#e53e3e;">Feature extraction failed or incomplete!</span>';
            console.log("Content script responded, but no score. Response:", response);
          }
        });
      });
    });
  }
});
