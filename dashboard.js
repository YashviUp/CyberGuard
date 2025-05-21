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
    url.includes(chrome.runtime.id)
  ) return false;
  return /^https?:\/\//.test(url);
}

function fallbackIcons() {
  document.querySelectorAll('.usage-img').forEach(img => {
    img.addEventListener('error', function handler() {
      this.removeEventListener('error', handler);
      this.src = 'icons/default.jpg';
    });
  });
}

function getIconForDomain(domain) {
  // ... your ICONS mapping as before ...
  return 'icons/default.jpg';
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

function updateDashboard() {
  chrome.runtime.sendMessage({ type: 'getDashboardData' }, (data) => {
    document.getElementById('totalTime').textContent = msToHms(data.dailyUsage);
    renderSiteUsage(data.browsingHistory || {});
  });
}

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
