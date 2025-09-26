document.addEventListener('DOMContentLoaded', () => {
  const calendarGrid = document.getElementById('calendar-grid');
  const startHour = 8;
  const endHour = 20;
  const hourHeight = 60;

  chrome.storage.local.get('calendarEvents', (data) => {
    const events = data.calendarEvents || [];
    
    if (events.length === 0) {
      calendarGrid.innerHTML = '<p>No events found. Go back to the extension popup and click "Capture and Analyze".</p>';
      return;
    }

    // Group valid, upcoming events by date
    const eventsByDate = groupEventsByDate(events);
    const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a) - new Date(b));

    if (sortedDates.length === 0) {
      calendarGrid.innerHTML = '<p>No upcoming events to display.</p>';
      return;
    }

    // Create a timeline for each day
    sortedDates.forEach(dateStr => {
      const dayColumn = document.createElement('div');
      dayColumn.className = 'timeline-day';

      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      dayHeader.textContent = new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      dayColumn.appendChild(dayHeader);

      const timeline = document.createElement('div');
      timeline.className = 'timeline';

      // Create time slots from 8 AM to 8 PM
      for (let i = startHour; i < endHour; i++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        const timeLabel = document.createElement('span');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${i % 12 === 0 ? 12 : i % 12} ${i < 12 ? 'AM' : 'PM'}`;
        timeSlot.appendChild(timeLabel);
        timeline.appendChild(timeSlot);
      }

      // Place events on the timeline
      eventsByDate[dateStr].forEach(event => {
        const [sHour, sMinute] = parseTime(event.time);
        if (sHour !== null && sHour >= startHour && sHour < endHour) {
          const eventElement = createEventElement(event);
          const topPosition = ((sHour - startHour) + (sMinute / 60)) * hourHeight;
          eventElement.style.top = `${topPosition}px`;
          eventElement.style.height = `${hourHeight - 2}px`;
          timeline.appendChild(eventElement);
        }
      });

      dayColumn.appendChild(timeline);
      calendarGrid.appendChild(dayColumn);
    });
  });

  function parseEventDate(dateStr) {
    const d = new Date(dateStr);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return null;
    }
    return d;
  }

  function groupEventsByDate(events) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.reduce((acc, event) => {
      const eventDate = parseEventDate(event.date);
      // Only include events with a valid date that is today or in the future
      if (eventDate && eventDate >= today) {
        const dateKey = eventDate.toDateString();
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(event);
      }
      return acc;
    }, {});
  }

  function createEventElement(event) {
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
    return eventElement;
  }

  function parseTime(timeStr) {
    if (!timeStr) return [null, null];
    const timePart = timeStr.split(' ')[0];
    const modifier = timeStr.split(' ')[1];
    let [hours, minutes] = timePart.split(':').map(Number);

    if (modifier && modifier.toLowerCase().includes('pm') && hours < 12) {
      hours += 12;
    }
    if (modifier && modifier.toLowerCase().includes('am') && hours === 12) {
      hours = 0;
    }
    return [hours, minutes || 0];
  }
});
