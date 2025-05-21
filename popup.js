// Shared utilities
const utils = {
  isTrackableUrl(url) {
    if (!url) return false;
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.includes(chrome.runtime.id)
    ) return false;
    return /^https?:\/\//.test(url);
  },

  msToHms(duration) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)));
    return `${hours}h ${minutes}m ${seconds}s`;
  }
};

// Shared site usage rendering
function renderSiteUsage(browsingHistory, containerId = 'siteUsageList') {
  const list = document.getElementById(containerId);
  if (!list) return;

  if (!browsingHistory || Object.keys(browsingHistory).length === 0) {
    list.innerHTML = '<div style="color:#888;text-align:center;">No site usage data yet.</div>';
    return;
  }

  const filtered = Object.entries(browsingHistory)
    .filter(([site]) => utils.isTrackableUrl('https://' + site))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (filtered.length === 0) {
    list.innerHTML = '<div style="color:#888;text-align:center;">No site usage data yet.</div>';
    return;
  }

  const max = filtered[0][1] || 1;
  const html = filtered.map(([site, ms]) => {
    const percent = Math.min(100, Math.round((ms / max) * 100));
    return `
      <div class="usage-row">
        <div class="usage-details">
          <div class="usage-title">${site} ${utils.msToHms(ms)}</div>
        </div>
      </div>
    `;
  }).join('');

  list.innerHTML = html;
}

// Optimized time tracking
const timeTracker = {
  lastUsage: 0,
  lastFetched: Date.now(),
  updateInterval: null,

  async updateTime() {
    try {
      const data = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'getDashboardData' }, resolve);
      });

      this.lastUsage = data.dailyUsage || 0;
      this.lastFetched = Date.now();
      
      const totalTimeElement = document.getElementById('totalTime');
      if (totalTimeElement) {
        totalTimeElement.textContent = utils.msToHms(this.lastUsage);
      }
      
      renderSiteUsage(data.browsingHistory);
    } catch (error) {
      console.error('Error updating time:', error);
    }
  },

  startLiveTimer() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastFetched;
      const totalTimeElement = document.getElementById('totalTime');
      
      if (totalTimeElement) {
        totalTimeElement.textContent = utils.msToHms(this.lastUsage + elapsed);
      }
    }, 1000);
  },

  stopLiveTimer() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  timeTracker.updateTime();
  timeTracker.startLiveTimer();

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
  const resultDiv = document.getElementById('phishingResult');
  
  if (testBtn && resultDiv) {
    testBtn.addEventListener('click', async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">No active tab found.</span>';
          return;
        }

        const tab = tabs[0];
        const url = tab.url || '';
        
        if (!/^https?:\/\//.test(url)) {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">Cannot analyze this page.</span>';
          return;
        }

        const response = await new Promise(resolve => {
          chrome.tabs.sendMessage(tab.id, { action: 'analyze_page' }, resolve);
        });

        if (chrome.runtime.lastError) {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">Error: Content script not available</span>';
          return;
        }

        if (response && response.score !== undefined) {
          const score = (response.score * 100).toFixed(1);
          const verdict = response.score > 0.98
            ? `<span style="color:#e53e3e;font-weight:bold;">Phishing Detected! (Score: ${score}%)</span>`
            : `<span style="color:#38a169;font-weight:bold;">Safe (Score: ${score}%)</span>`;
          resultDiv.innerHTML = verdict;
        } else {
          resultDiv.innerHTML = '<span style="color:#e53e3e;">Feature extraction failed or incomplete!</span>';
        }
      } catch (error) {
        console.error('Phishing test error:', error);
        resultDiv.innerHTML = '<span style="color:#e53e3e;">Error during analysis</span>';
      }
    });
  }
});