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
    url.includes(chrome.runtime.id)
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
  setInterval(updateDashboard, 60000);
});

document.addEventListener('DOMContentLoaded', () => {
  const logoImg = document.querySelector('.dashboard-icon img');
  if (logoImg) {
    logoImg.addEventListener('error', function handler() {
      this.style.display = 'none';
    });
  }
});
// Parent Mode logic
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  setInterval(updateDashboard, 60000);

  // Parent Mode modal logic
  const parentSwitch = document.getElementById('parentModeSwitch');
  const parentModal = document.getElementById('parentModeModal');
  const parentSection = document.getElementById('parentModeSection');
  const parentForm = document.getElementById('parentAuthForm');
  const parentMsg = document.getElementById('parentAuthMsg');
  let parentVerified = false;

  parentSwitch.addEventListener('change', function() {
    if (this.checked) {
      parentModal.style.display = 'flex';
      parentMsg.textContent = '';
      parentForm.reset();
    } else {
      parentSection.style.display = 'none';
      parentSection.innerHTML = '';
      parentVerified = false;
    }
  });

  parentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('parentEmail').value.trim();
    const otp = document.getElementById('parentOTP').value.trim();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      parentMsg.textContent = "Invalid email address.";
      return;
    }
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      parentMsg.textContent = "Enter a valid 6-digit OTP (simulation).";
      return;
    }
    parentMsg.style.color = "#38a169";
    parentMsg.textContent = "OTP Verified! Loading parental dashboard...";
    setTimeout(() => {
      parentModal.style.display = 'none';
      parentSection.style.display = 'block';
      parentSection.innerHTML = `
        <div style="background:#f8fafc;border:1.5px solid #3182ce;border-radius:14px;padding:18px 16px;margin-bottom:12px;">
          <h3 style="color:#3182ce;font-size:1.2em;margin-bottom:8px;">Parental Oversight Simulation</h3>
          <div style="background:#fffbe6;border-left:4px solid #e53e3e;padding:10px 14px;border-radius:8px;margin-bottom:10px;">
            <b>Real-Time Alert Example:</b> Potentially unsafe behavior detected: Child visited a risky website (<span style="color:#e53e3e;">example-phishing.com</span>). (Simulation)
          </div>
          <div style="background:#f1f5f9;border-radius:8px;padding:12px 14px;">
            <h4 style="margin:0 0 6px 0;font-weight:600;">Simulated Activity Log:</h4>
            <ul style="margin:0;padding-left:18px;font-size:0.98em;color:#444;">
              <li>User logged into SocialApp at 10:00 AM.</li>
              <li>Visited <b>example-phishing.com</b> at 10:05 AM <span style="color:#e53e3e;font-weight:500;">(Risky Website Alert Sent - Simulation)</span>.</li>
              <li>Received DM from unknown_user_789 at 10:10 AM <span style="color:#e67e22;font-weight:500;">(Unknown Contact Alert Sent - Simulation)</span>.</li>
              <li>Sent message containing harsh language at 10:15 AM <span style="color:#e53e3e;font-weight:500;">(Harsh Language Alert Sent, Message Hidden - Simulation)</span>.</li>
              <li>Attempted to share phone number in chat at 10:20 AM <span style="color:#b91c1c;font-weight:500;">(Sensitive Info Sharing Blocked - Simulation)</span>.</li>
              <li>Changed privacy settings at 10:25 AM <span style="color:#3182ce;font-weight:500;">(Privacy Alert Sent - Simulation)</span>.</li>
              <li>Downloaded unknown file at 10:28 AM <span style="color:#e53e3e;font-weight:500;">(Download Alert Sent - Simulation)</span>.</li>
            </ul>
          </div>
          <div style="background:#e0f7fa;border-radius:8px;padding:12px 14px;margin-top:10px;">
            <h4 style="margin:0 0 6px 0;font-weight:600;">Simulated Parental Controls:</h4>
            <ul style="margin:0;padding-left:18px;font-size:0.97em;color:#444;">
              <li>Screen time limit: <b>3 hours/day</b> <span style="color:#3182ce;">(Active)</span></li>
              <li>Blocked categories: <b>Adult, Gambling, Phishing</b></li>
              <li>DM/Chat monitoring: <b>On</b></li>
              <li>Content filter: <b>Strict</b></li>
              <li>Location access: <b>Blocked</b></li>
              <li>App install requests: <b>Require approval</b></li>
            </ul>
          </div>
          <p style="font-size:0.92em;color:#888;margin-top:10px;">
            <i>Note: In a real application, alerts would be sent to a separate parent interface, and actions like hiding/blocking would depend on the parental control settings. This is a simulation.</i>
          </p>
        </div>
      `;
      parentVerified = true;
    }, 1200);
  });

  // Optional: close modal if user clicks outside
  parentModal.addEventListener('click', (e) => {
    if (e.target === parentModal) {
      parentModal.style.display = 'none';
      parentSwitch.checked = false;
    }
  });
});
