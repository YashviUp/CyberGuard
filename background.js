let countingActive = false;
let timerId = null;
const MAX_DAILY_TIME = 3 * 60 * 60 * 1000; // 3 hours in ms

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

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    dailyUsage: 0,
    lastUsageDate: new Date().toDateString(),
    browsingHistory: {}
  });
  chrome.alarms.create('usageIncrement', { periodInMinutes: 1 });
});

// Start tracking and alarm on browser startup
chrome.runtime.onStartup.addListener(() => {
  startCounting();
  chrome.alarms.create('usageIncrement', { periodInMinutes: 1 });
});

// Track active tab changes
chrome.tabs.onActivated.addListener(() => {
  if (!countingActive) {
    startCounting();
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    stopCounting();
  } else {
    startCounting();
  }
});

function startCounting() {
  if (countingActive) return;
  countingActive = true;

  timerId = setInterval(async () => {
    await resetDailyUsageIfNeeded();

    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

    if (tabs.length === 0) return;

    try {
      const tab = tabs[0];
      if (!isTrackableUrl(tab.url)) return;

      const url = new URL(tab.url);
      const domain = url.hostname;

      const data = await chrome.storage.local.get(['dailyUsage', 'browsingHistory']);
      let newUsage = (data.dailyUsage || 0) + 1000; // increment by 1 second
      let history = data.browsingHistory || {};
      history[domain] = (history[domain] || 0) + 1000;

      await chrome.storage.local.set({
        dailyUsage: newUsage,
        browsingHistory: history
      });

      if (newUsage >= MAX_DAILY_TIME) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showBigPopup',
          reason: 'Daily 3-hour limit reached. Take a break!'
        });
      }
    } catch (e) {
      console.error('Usage tracking error:', e);
    }
  }, 1000);
}

function stopCounting() {
  countingActive = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

// Daily reset logic
async function resetDailyUsageIfNeeded() {
  const data = await chrome.storage.local.get(['lastUsageDate']);
  const today = new Date().toDateString();

  if (data.lastUsageDate !== today) {
    await chrome.storage.local.set({
      dailyUsage: 0,
      lastUsageDate: today,
      browsingHistory: {}
    });
  }
}

// Alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'usageIncrement') {
    await resetDailyUsageIfNeeded();

    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

    if (tabs.length === 0) return;

    try {
      const tab = tabs[0];
      if (!isTrackableUrl(tab.url) || tab.status === 'unloaded') return;
      const url = new URL(tab.url);
      const domain = url.hostname;

      const data = await chrome.storage.local.get([
        'dailyUsage',
        'browsingHistory'
      ]);

      let newUsage = (data.dailyUsage || 0) + 60 * 1000;
      let history = data.browsingHistory || {};
      history[domain] = (history[domain] || 0) + 60 * 1000;

      await chrome.storage.local.set({
        dailyUsage: newUsage,
        browsingHistory: history
      });

      if (newUsage >= MAX_DAILY_TIME) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showBigPopup',
          reason: 'Daily 3-hour limit reached. Take a break!'
        });
      }
    } catch (e) {
      console.error('Usage tracking error:', e);
    }
  }
});

// Unified message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getDashboardData':
      chrome.storage.local.get(['dailyUsage', 'browsingHistory'])
        .then(data => sendResponse({
          dailyUsage: data.dailyUsage || 0,
          browsingHistory: data.browsingHistory || {}
        }));
      return true; // Keep channel open for async response

    case 'showWarning':
      if (sender.tab && isTrackableUrl(sender.tab.url)) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'showBigPopup',
          reason: message.reason
        });
      }
      break;

    case 'startCounting':
      startCounting();
      sendResponse({ status: 'counting started' });
      break;

    case 'stopCounting':
      stopCounting();
      sendResponse({ status: 'counting stopped' });
      break;

    case 'phishing_alert':
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/alert.png',
        title: 'Phishing Alert!',
        message: `Suspicious page detected (score: ${message.score.toFixed(2)})`,
        buttons: [{ title: 'Learn More' }]
      });
      break;
  }
});

// Optionally, inject analyzePage only on trackable URLs (if needed)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isTrackableUrl(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        if (typeof analyzePage === 'function') analyzePage();
      }
    }).catch(() => {});
  }
});
