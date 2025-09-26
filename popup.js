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

  // Load and display events when popup opens
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
    // Optionally, show a loading message
    eventsContainer.innerHTML = '<p>Analyzing calendars...</p>';
  });

  function addUrlToList(url) {
    const listItem = document.createElement('li');
    
    const urlText = document.createElement('span');
    urlText.className = 'url-text';
    urlText.textContent = url;

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-url-btn';
    removeButton.textContent = '✖';
    removeButton.title = 'Remove URL';
    removeButton.addEventListener('click', () => {
      removeUrl(url, listItem);
    });

    listItem.appendChild(urlText);
    listItem.appendChild(removeButton);
    urlList.appendChild(listItem);
  }

  function removeUrl(urlToRemove, listItemElement) {
    chrome.storage.sync.get('calendarUrls', (data) => {
      let urls = data.calendarUrls || [];
      const updatedUrls = urls.filter(url => url !== urlToRemove);
      chrome.storage.sync.set({ calendarUrls: updatedUrls }, () => {
        listItemElement.remove();
        console.log(`Removed URL: ${urlToRemove}`);
      });
    });
  }

  function loadAndDisplayEvents() {
    chrome.storage.local.get('calendarEvents', (data) => {
      const events = data.calendarEvents || [];
      eventsContainer.innerHTML = ''; // Clear existing content

      if (events.length === 0) {
        eventsContainer.innerHTML = '<p>No events found. Click "Capture and Analyze" to get started.</p>';
        return;
      }

      const eventsByDate = groupEventsByDate(events);
      const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a) - new Date(b));

      if (sortedDates.length === 0) {
        eventsContainer.innerHTML = '<p>No upcoming events to display.</p>';
        return;
      }

      sortedDates.forEach(dateStr => {
        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        dayGroup.appendChild(dayHeader);

        eventsByDate[dateStr].forEach(event => {
          const eventElement = document.createElement('div');
          eventElement.className = 'event';

          const titleElement = document.createElement('div');
          titleElement.className = 'event-title';
          titleElement.textContent = event.title;

          const timeElement = document.createElement('div');
          timeElement.className = 'event-time';
          timeElement.textContent = event.time;

          eventElement.appendChild(titleElement);
          eventElement.appendChild(timeElement);
          dayGroup.appendChild(eventElement);
        });
        eventsContainer.appendChild(dayGroup);
      });
    });
  }

  function groupEventsByDate(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.reduce((acc, event) => {
      const eventDate = new Date(event.date);
      if (!isNaN(eventDate.getTime()) && eventDate >= today) {
        const dateKey = eventDate.toDateString();
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(event);
      }
      return acc;
    }, {});
  }

  // Listen for storage changes to update the view live
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.calendarEvents) {
      loadAndDisplayEvents();
    }
  });
});
