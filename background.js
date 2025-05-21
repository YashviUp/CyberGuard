let countingActive = false;
let timerId = null;
const MAX_DAILY_TIME = 3 * 60 * 60 * 1000; // 3 hours in ms

// Unified counting state management
const countingState = {
  active: false,
  timerId: null,
  lastUpdate: Date.now()
};

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

// Optimized counting functions
function startCounting() {
  if (countingState.active) return;
  countingState.active = true;
  countingState.lastUpdate = Date.now();

  countingState.timerId = setInterval(async () => {
    await resetDailyUsageIfNeeded();
    await updateUsage();
  }, 1000);
}

function stopCounting() {
  countingState.active = false;
  if (countingState.timerId) {
    clearInterval(countingState.timerId);
    countingState.timerId = null;
  }
}

// Optimized usage update function
async function updateUsage() {
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
    const now = Date.now();
    const timeDiff = now - countingState.lastUpdate;
    countingState.lastUpdate = now;

    const data = await chrome.storage.local.get(['dailyUsage', 'browsingHistory']);
    let newUsage = (data.dailyUsage || 0) + timeDiff;
    let history = data.browsingHistory || {};
    history[domain] = (history[domain] || 0) + timeDiff;

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

// Optimized event listeners
const debouncedStartCounting = debounce(startCounting, 100);
const debouncedStopCounting = debounce(stopCounting, 100);

chrome.tabs.onActivated.addListener(debouncedStartCounting);
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    debouncedStopCounting();
  } else {
    debouncedStartCounting();
  }
});

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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

// Optimized alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'usageIncrement' && countingState.active) {
    await updateUsage();
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