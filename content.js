if (!window.cyberGuardContentScriptInjected) {
  window.cyberGuardContentScriptInjected = true;
  const filter = new Filter();
  filter.addWords(
        // English Profanity
        "sh1t", "bu1lshit", "cr@p", "b@stard", "b!tch", "s!ut", "wh0re", "h0oker", "d!ck", "c0ck", "twat", "prick",
        "wanker", "negro", "d0uchebag", "cum", "jizz", "nutjob", "nutcase", "fag", "faggot", "retard", "coon", "chink", "gook", "spic", "wetback", "beaner", "tranny", "he-she", "shemale",
        "queer", "dyke", "lesbo", "paki", "kike", "kafir", "infidel", "mofo", "ballsack",
      // Hindi / Urdu / Punjabi
      "chutiya", "bhenchod", "madarchod", "loda", "lund", "lavda", "gaand", "gandu", "chut", "randi", "haraami",
      "haraamzada", "kutte", "kutti", "saala", "saali", "launda", "chod", "chodne", "chodna", "chodu", "chudai",
      "puki", "bhosdi", "bhosadike", "bakchod", "pimp", "nangi", "kamina", "kameeni", "bhadwa", "bhadwe", "chinal",
      "chinaal", "gaand mara", "chus le", "chusna", "jhatu", "jhant", "jhantichod", "jhav", "jhavaNe", "lund choos",
    
      // Tamil / Telugu / Kannada
      "soothu", "pundai", "otha", "ommaala", "koodhi", "shithi", "panni", "sori naai", "mandha buddhi", "paithiyam",
      "koomuttai", "muttaal", "loosu", "karumam", "porambokku", "erumai", "maanangettava", "nayala", "kunda", "kundi",
      "naaye", "kirukkan", "kasmalam", "paradesi", "kedi", "seththuppo", "thendi", "aambala", "thiruttu", "sootha kutti",
    
      // Marathi / Gujarati / Bengali / Odia
      "rand", "veshya", "chinAl", "bhadva", "bhadavyA", "aijhavADyA", "phodarIchyA", "toMDAt ghe", "chokh mAjhA lavaDA",
      "bahutAta", "yabhati", "pAyu", "bhagAsya", "jAragarbha", "veshyAsuta", "kanjar", "khotya", "kamino", "chodibaaj",
      "gandfattu", "chodanari", "ulanga", "chodfodu",
    
      // Filter Evasion / Leet Variants
      "f*ck", "f@ck", "fcuk", "phuck", "fuk", "sh1t", "s#it", "b!tch", "b1tch", "bi7ch", "a$$hole", "a55hole",
      "pu$$y", "d1ck", "c0ck", "c*nt", "tw@t", "w@nker", "w4nker", "n1gger", "n!gger", "b@stard", "s!ut", "s1ut",
      "wh0re", "wh@re", "s0n of a b!tch", "l@vda", "m@darchod", "b#enchod", "c#tiya", "r@ndi"
  );
  
  // Sensitive fields to warn about
  const SENSITIVE_FIELDS = [
    'password', 'credit', 'card', 'cvv', 'ssn', 'aadhaar', 'upi', 'atm',
    'pin', 'debit', 'account', 'mobile', 'phone', 'address'
  ];
  
  // Helper functions
  function containsBadWords(text) {
    if (!text) return false;
    return filter.isProfane(text);
  }
  function containsSensitive(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return SENSITIVE_FIELDS.some(field => lower.includes(field));
  }
  // ===================
  // 2. Phishing Detection
  // ===================
  const PHISHING_THRESHOLD = 0.98;

  function extractPhishingFeatures(url, doc) {
    const getDomain = (url) => {
      try { return new URL(url).hostname; } catch { return ''; }
    };
    const countOccurrences = (str, char) =>
      (str.match(new RegExp(`\\${char}`, 'g')) || []).length;

    const features = [
      url.length,
      countOccurrences(url, '.'),
      countOccurrences(url, '/'),
      countOccurrences(url, '@'),
      countOccurrences(url, '?'),
      countOccurrences(url, '-'),
      countOccurrences(url, '='),
      countOccurrences(url, '_'),
      countOccurrences(url, '&'),
      countOccurrences(url, '%'),
      countOccurrences(url, '#'),
      countOccurrences(url, '$'),
      countOccurrences(url, '!'),
      countOccurrences(url, '*'),
      countOccurrences(url, ','),
      countOccurrences(url, ';'),
      countOccurrences(url, ':'),
      countOccurrences(url, '+'),
      countOccurrences(url, '~'),
      (url.match(/[a-z]/g) || []).length,
      (url.match(/[0-9]/g) || []).length,
      (url.match(/[^a-zA-Z0-9]/g) || []).length,
      url.includes('@') ? 1 : 0,
      getDomain(url).includes('-') ? 1 : 0,
      url.startsWith('https://') ? 1 : 0,
      Math.max(getDomain(url).split('.').length - 2, 0),
      doc.querySelectorAll('a').length,
      Array.from(doc.querySelectorAll('a')).filter(a => {
        try {
          return new URL(a.href).hostname !== getDomain(url);
        } catch { return false; }
      }).length,
      doc.querySelectorAll('form').length,
      doc.querySelectorAll('iframe').length > 0 ? 1 : 0
    ];
    return features;
  }

  function phishingScore(features) {
    const weights = [
      0.03, 0.02, 0.02, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01,
      0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
      0.02, 0.02, 0.05, 0.04, 0.05, 0.04, 0.03, 0.03, 0.03, 0.03
    ];
    let score = 0;
    for (let i = 0; i < features.length; ++i) {
      score += features[i] * weights[i];
    }
    return Math.min(score / 5, 1);
  }

  // ===================
  // 3. UI Popups
  // ===================
  function showSiteSuggestionPopup(message) {
    if (document.getElementById('cyberguard-suggestion-popup')) return;
    const popup = document.createElement('div');
    popup.id = 'cyberguard-suggestion-popup';
    popup.textContent = message;
    Object.assign(popup.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(74,144,226,0.95)',
      color: 'white',
      padding: '12px 22px',
      borderRadius: '14px',
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '15px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
      zIndex: 2147483647,
      opacity: '0',
      transition: 'opacity 0.3s'
    });
    document.body.appendChild(popup);
    setTimeout(() => popup.style.opacity = '1', 10);
    setTimeout(() => {
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 300);
    }, 5000);
  }

  function showBigPopup(message) {
    if (document.getElementById('cyberguard-big-popup')) return;
    const overlay = document.createElement('div');
    overlay.id = 'cyberguard-big-popup';
    Object.assign(overlay.style, {
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(8px)',
      zIndex: 2147483647, display: 'flex', justifyContent: 'center', alignItems: 'center'
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'white', borderRadius: '18px', padding: '40px', textAlign: 'center',
      maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', fontFamily: 'sans-serif'
    });

    card.innerHTML = `
      <h2 style="color:#e63946;">⚠️ Cyber Guard Alert</h2>
      <p style="font-size:16px;">${message}</p>
      <button style="margin-top:20px;padding:10px 20px;font-weight:bold;
      background:#4a90e2;color:white;border:none;border-radius:8px;cursor:pointer;">OK</button>
    `;
    card.querySelector('button').onclick = () => overlay.remove();
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ===================
  // 4. Main Logic (Single Event Listeners)
  // ===================
  function analyzePage() {
    const features = extractPhishingFeatures(window.location.href, document);
    const score = phishingScore(features);
    if (score > PHISHING_THRESHOLD) {
      showBigPopup(`⚠️ Warning: High phishing risk detected (${(score * 100).toFixed(1)}%)`);
    }
  }

  // Only one DOMContentLoaded listener
  document.addEventListener('DOMContentLoaded', () => {
    showSiteSuggestionPopup("Cyber Guard: Don't share sensitive info on suspicious sites.");
    analyzePage();
  });

  // Only one input event listener
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      const value = target.value || target.textContent || '';
      const name = target.name || target.type || target.placeholder || '';
      if (containsSensitive(name)) {
        showSiteSuggestionPopup('Be careful! Sensitive field detected.');
      }
      if (containsBadWords(value)) {
        showBigPopup('⚠️ Abusive or offensive language detected. Please revise your input.');
        target.focus();
      }
    }
  }, true);

  // Only one password field focusin listener
  document.addEventListener('focusin', (event) => {
    const el = event.target;
    if (el.tagName === 'INPUT' && el.type === 'password') {
      showSiteSuggestionPopup('Use a strong, unique password. Stay safe!');
    }
  });

  // Only one message listener
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'analyze_page') {
      try {
        const features = extractPhishingFeatures(window.location.href, document);
        const score = phishingScore(features);
        if (score > PHISHING_THRESHOLD) {
          showBigPopup(`⚠️ Warning: High phishing risk detected (${(score * 100).toFixed(1)}%)`);
        }
        sendResponse({ score });
      } catch (e) {
        sendResponse({ error: 'Feature extraction failed', details: e.message });
      }
      return true;
    }
  });

}
