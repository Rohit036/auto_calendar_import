document.addEventListener('DOMContentLoaded', () => {
  const saveUrlButton = document.getElementById('save-url');
  const calendarUrlInput = document.getElementById('calendar-url');
  const urlList = document.getElementById('url-list');
  const captureAndAnalyzeButton = document.getElementById('capture-and-analyze');
  const eventsContainer = document.getElementById('events-container');

  // Load and display saved URLs
  chrome.storage.sync.get('calendarUrls', (data) => {
    const urls = data.calendarUrls || [];
    urls.forEach(url => addUrlToList(url));
  });

  // Load and display events
  loadAndDisplayEvents();

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

  function loadAndDisplayEvents() {
    chrome.storage.local.get('calendarEvents', (data) => {
      const events = data.calendarEvents || [];
      eventsContainer.innerHTML = ''; // Clear existing events

      if (events.length === 0) {
        eventsContainer.textContent = 'No events found. Click "Capture and Analyze" to get started.';
        return;
      }

      events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.className = 'event';

        const titleElement = document.createElement('div');
        titleElement.className = 'event-title';
        titleElement.textContent = event.title;

        const timeElement = document.createElement('div');
        timeElement.className = 'event-time';
        timeElement.textContent = `${event.date} at ${event.time}`;

        eventElement.appendChild(titleElement);
        eventElement.appendChild(timeElement);
        eventsContainer.appendChild(eventElement);
      });
    });
  }

  // Listen for storage changes to update the view live
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.calendarEvents) {
      loadAndDisplayEvents();
    }
  });
});
