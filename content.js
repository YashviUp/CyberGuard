if (!window.cyberGuardContentScriptInjected) {
  window.cyberGuardContentScriptInjected = true;

  const TRUSTED_DOMAINS = [
    "linkedin.com", "google.com", "github.com", "wikipedia.org", "microsoft.com",
    "facebook.com", "x.com", "instagram.com", "amazon.com", "apple.com"
  ];

  function isTrustedDomain(domain) {
    const parts = domain.split('.').slice(-2).join('.');
    return TRUSTED_DOMAINS.includes(parts);
  }

  const SENSITIVE_FIELDS = new Set([
    'password', 'credit', 'card', 'cvv', 'ssn', 'aadhaar', 'upi', 'atm', 'pin', 'debit', 'account', 'mobile', 'phone', 'email', 'address'
  ]);

  const BAD_WORDS = new Set([
    'badword1', 'badword2', 'badword3', 'badword4', 'badword5'
  ]);

  function showBigPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    popup.style.color = 'white';
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.zIndex = '9999';
    popup.innerText = message;
    document.body.appendChild(popup);
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 5000);
  }

  function showSiteSuggestionPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.bottom = '10px';
    popup.style.right = '10px';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    popup.style.color = 'white';
    popup.style.padding = '10px';
    popup.style.borderRadius = '5px';
    popup.style.zIndex = '9999';
    popup.innerText = message;
    document.body.appendChild(popup);
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 5000);
  }

  function analyzePage() {
    const textContent = document.body.innerText.toLowerCase();
    for (const word of BAD_WORDS) {
      if (textContent.includes(word)) {
        showBigPopup('Warning: Inappropriate content detected!');
        break;
      }
    }

    const inputs = document.querySelectorAll('input, textarea');
    for (const input of inputs) {
      const type = input.getAttribute('type') || '';
      const name = input.getAttribute('name') || '';
      const placeholder = input.getAttribute('placeholder') || '';
      const combined = `${type} ${name} ${placeholder}`.toLowerCase();
      for (const field of SENSITIVE_FIELDS) {
        if (combined.includes(field)) {
          showSiteSuggestionPopup('Sensitive field detected. Be cautious!');
          break;
        }
      }
    }
  }

  analyzePage();
}
