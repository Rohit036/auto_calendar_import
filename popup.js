document.addEventListener('DOMContentLoaded', () => {
  const saveUrlButton = document.getElementById('save-url');
  const calendarUrlInput = document.getElementById('calendar-url');
  const urlList = document.getElementById('url-list');
  const captureAndAnalyzeButton = document.getElementById('capture-and-analyze');

  // Load and display saved URLs
  chrome.storage.sync.get('calendarUrls', (data) => {
    const urls = data.calendarUrls || [];
    urls.forEach(url => addUrlToList(url));
  });

  saveUrlButton.addEventListener('click', () => {
    const newUrl = calendarUrlInput.value.trim();
    if (newUrl) {
      chrome.storage.sync.get('calendarUrls', (data) => {
        const urls = data.calendarUrls || [];
        if (!urls.includes(newUrl)) {
          urls.push(newUrl);
          chrome.storage.sync.set({ calendarUrls: urls }, () => {
            addUrlToList(newUrl);
            calendarUrlInput.value = '';
          });
        }
      });
    }
  });

  captureAndAnalyzeButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'captureAndAnalyze' });
  });

  function addUrlToList(url) {
    const listItem = document.createElement('li');
    listItem.textContent = url;
    urlList.appendChild(listItem);
  }
});
