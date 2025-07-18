if (!window.cyberGuardContentScriptInjected) {
  window.cyberGuardContentScriptInjected = true;
  
  // Optimized data structures
  const TRUSTED_DOMAINS = new Set([
    "linkedin.com", "google.com", "github.com", "wikipedia.org", "microsoft.com",
    "facebook.com", "x.com", "instagram.com", "amazon.com", "apple.com"
  ]);

  const SENSITIVE_FIELDS = new Set([
    'password', 'credit', 'card', 'cvv', 'ssn', 'aadhaar', 'upi', 'atm', 'pin',
    'debit', 'account', 'mobile', 'phone', 'address', 'userid'
  ]);

  // Optimized domain check
  function isTrustedDomain(domain) {
    const parts = domain.split('.').slice(-2).join('.');
    return TRUSTED_DOMAINS.has(parts);
  }

  // Optimized popup management
  const popupManager = {
    activePopups: new Set(),
    
    showBigPopup(message) {
      if (this.activePopups.has('big')) return;
      
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
      
      card.querySelector('button').onclick = () => {
        overlay.remove();
        this.activePopups.delete('big');
      };
      
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      this.activePopups.add('big');
    },
    
    showSiteSuggestionPopup(message) {
      if (this.activePopups.has('suggestion')) return;
      
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
      this.activePopups.add('suggestion');
      
      requestAnimationFrame(() => popup.style.opacity = '1');
      
      setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
          popup.remove();
          this.activePopups.delete('suggestion');
        }, 300);
      }, 5000);
    }
  };

  // Optimized content analysis
  const contentAnalyzer = {
    filter: new Filter(),
    
    init() {
      this.filter.addWords(
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
    },
    
    containsBadWords(text) {
      if (!text) return false;
      return this.filter.isProfane(text);
    },
    
    containsSensitive(text) {
      if (!text) return false;
      const lower = text.toLowerCase();
      return Array.from(SENSITIVE_FIELDS).some(field => lower.includes(field));
    }
  };

  // Optimized input handler
  const inputHandler = {
    handleInput(event) {
      const target = event.target;
      if (!target || (!target.value && !target.textContent)) return;
      
      const value = target.value || target.textContent;
      const label = target.name || target.type || target.placeholder || '';
    
      if (contentAnalyzer.containsSensitive(label)) {
        popupManager.showSiteSuggestionPopup('Sensitive input field detected.');
      }
      
      if (contentAnalyzer.containsBadWords(value)) {
        popupManager.showBigPopup('⚠️ Offensive language detected.');
        target.focus();
      }
    }
  };

  // Initialize components
  contentAnalyzer.init();
  document.addEventListener('input', inputHandler.handleInput.bind(inputHandler), true);

  // --- Attach to all password/sensitive fields, handle dynamic fields ---
  let cyberguardIdCounter = 1;
  function attachFieldTips() {
    // Password fields
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.dataset.cyberguardTip) return;
      input.dataset.cyberguardTip = "1";
      if (!input.dataset.cyberguardId) input.dataset.cyberguardId = "cg" + (cyberguardIdCounter++);
      input.addEventListener('focus', () => {
        showFloatingTip(input, "Use a strong, unique password.", "#3182ce");
      });
      input.addEventListener('input', () => {
        showFloatingTip(input, "Use a strong, unique password.", "#3182ce");
      });
      input.addEventListener('blur', () => {
        removeFloatingTip(input);
      });
    });
  
    // Sensitive fields (credit card, etc)
    document.querySelectorAll('input:not([type="password"]), textarea').forEach(input => {
      if (input.dataset.cyberguardSensitiveTip) return;
      input.dataset.cyberguardSensitiveTip = "1";
      if (!input.dataset.cyberguardId) input.dataset.cyberguardId = "cg" + (cyberguardIdCounter++);
      function updateTip() {
        const label = input.name || input.id || input.placeholder || '';
        if (contentAnalyzer.containsSensitive(label)) {
          showFloatingTip(input, "Sensitive input field detected.", "#e53e3e");
        } else {
          removeFloatingTip(input);
        }
      }
      input.addEventListener('focus', updateTip);
      input.addEventListener('input', updateTip);
      input.addEventListener('blur', () => {
        removeFloatingTip(input);
      });
    });
  }
  
  // --- Observe for dynamically added fields ---
  function observeNewFields() {
    const observer = new MutationObserver(() => {
      attachFieldTips();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // --- Add minimal CSS for tip (once) ---
  function injectTipCSS() {
    if (document.getElementById('cyberguard-tip-style')) return;
    const style = document.createElement('style');
    style.id = 'cyberguard-tip-style';
    style.textContent = `
      .cyberguard-floating-tip {
        font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
        opacity: 0.98;
        pointer-events: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }
  

  // --- Model ---
  let weightsBuffer = null;
  const INPUT_SIZE = 30, D1 = 100, D2 = 100, OUT = 1;
  const sigmoid = x => 1 / (1 + Math.exp(-x));
  function dense(input, weights, bias, outSize, activation) {
    const output = Array(outSize).fill(0);
    for (let i = 0; i < outSize; i++) {
      let sum = bias[i];
      for (let j = 0; j < input.length; j++) {
        sum += input[j] * weights[j * outSize + i];
      }
      output[i] = activation(sum);
    }
    return output;
  }
  async function loadWeights() {
    if (weightsBuffer) return weightsBuffer;
    const res = await fetch(chrome.runtime.getURL('phishing-model.weights.bin'));
    if (!res.ok) throw new Error("Failed to fetch phishing-model.weights.bin");
    const buf = await res.arrayBuffer();
    weightsBuffer = new Float32Array(buf);
    return weightsBuffer;
  }
  async function phishingModelPredict(input) {
    const weights = await loadWeights();
    let offset = 0;
    const w1 = weights.slice(offset, offset + INPUT_SIZE * D1); offset += INPUT_SIZE * D1;
    const b1 = weights.slice(offset, offset + D1); offset += D1;
    const w2 = weights.slice(offset, offset + D1 * D2); offset += D1 * D2;
    const b2 = weights.slice(offset, offset + D2); offset += D2;
    const w3 = weights.slice(offset, offset + D2 * OUT); offset += D2 * OUT;
    const b3 = weights.slice(offset, offset + OUT);
    const h1 = dense(input, w1, b1, D1, sigmoid);
    const h2 = dense(h1, w2, b2, D2, sigmoid);
    const out = dense(h2, w3, b3, OUT, sigmoid);
    return out[0];
  }

  // --- Feature Extraction ---
  function extractPhishingFeatures(url, doc) {
    const domain = new URL(url).hostname;
    const count = (str, ch) => (str.match(new RegExp(`\\${ch}`, 'g')) || []).length;
    const anchors = Array.from(doc.querySelectorAll('a'));
    return [
      url.length, count(url, '.'), count(url, '/'), count(url, '@'), count(url, '?'),
      count(url, '-'), count(url, '='), count(url, '_'), count(url, '&'), count(url, '%'),
      count(url, '#'), count(url, '$'), count(url, '!'), count(url, '*'), count(url, ','),
      count(url, ';'), count(url, ':'), count(url, '+'), count(url, '~'),
      (url.match(/[a-z]/g) || []).length,
      (url.match(/[0-9]/g) || []).length,
      (url.match(/[^a-zA-Z0-9]/g) || []).length,
      url.includes('@') ? 1 : 0,
      domain.includes('-') ? 1 : 0,
      url.startsWith('https://') ? 1 : 0,
      Math.max(domain.split('.').length - 2, 0),
      anchors.length,
      anchors.filter(a => { try { return new URL(a.href).hostname !== domain; } catch { return false; } }).length,
      doc.querySelectorAll('form').length,
      doc.querySelectorAll('iframe').length > 0 ? 1 : 0
    ];
  }

  async function analyzePage() {
    const input = extractPhishingFeatures(window.location.href, document);
    const score = await phishingModelPredict(input);
    const domain = new URL(window.location.href).hostname;
    if (!isTrustedDomain(domain) && score > 0.995) {
      popupManager.showBigPopup(`⚠️ Phishing risk detected: ${(score * 100).toFixed(1)}%`);
    }
  }

  document.addEventListener('focusin', (event) => {
    const el = event.target;
    if (el.tagName === 'INPUT' && el.type === 'password') {
      popupManager.showSiteSuggestionPopup('Use a strong, unique password.');
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'analyze_page') {
      (async () => {
        try {
          const features = extractPhishingFeatures(window.location.href, document);
          if (!features || features.length !== 30) {
            sendResponse({ error: 'Feature extraction failed or incomplete!' });
            return;
          }
          const score = await phishingModelPredict(features);
          const domain = new URL(window.location.href).hostname;
          if (!isTrustedDomain(domain) && score > 0.98) {
            popupManager.showBigPopup(`⚠️ Phishing risk detected: ${(score * 100).toFixed(1)}%`);
          }
          sendResponse({ score });
        } catch (e) {
          sendResponse({ error: 'Feature extraction failed', details: e.message });
        }
      })();
      return true;
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    injectTipCSS();
    attachFieldTips();
    observeNewFields();
    popupManager.showSiteSuggestionPopup("Cyber Guard active: Avoid sharing sensitive info.");
    analyzePage();
  });
  }