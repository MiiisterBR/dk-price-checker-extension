document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const settingsBtn = document.getElementById('settingsBtn');

  // Check if API key is set
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      statusDot.classList.add('active');
      statusText.textContent = 'کلید OpenAI تنظیم شده';
    } else {
      statusText.textContent = 'کلید OpenAI تنظیم نشده';
    }
  });

  // Open options page
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
