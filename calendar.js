document.addEventListener('DOMContentLoaded', () => {
  const calendarGrid = document.getElementById('calendar-grid');

  chrome.storage.local.get('calendarEvents', (data) => {
    const events = data.calendarEvents || [];
    
    if (events.length === 0) {
      calendarGrid.innerHTML = '<p>No events found. Go back to the extension popup and click "Capture and Analyze".</p>';
      return;
    }

    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
      const date = new Date(event.date).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a) - new Date(b));

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

      // Create time slots from 12 AM to 11 PM
      for (let i = 0; i < 24; i++) {
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
        const eventElement = createEventElement(event);
        const [startHour, startMinute] = parseTime(event.time);
        
        if (startHour !== null) {
          const topPosition = (startHour + startMinute / 60) * 60; // 60px per hour
          eventElement.style.top = `${topPosition}px`;
          
          // Basic duration calculation (assuming 1 hour if no end time)
          eventElement.style.height = '58px'; // Slightly less than slot for visual spacing

          timeline.appendChild(eventElement);
        }
      });

      dayColumn.appendChild(timeline);
      calendarGrid.appendChild(dayColumn);
    });
  });

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
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier && modifier.toLowerCase() === 'pm' && hours < 12) {
      hours += 12;
    }
    if (modifier && modifier.toLowerCase() === 'am' && hours === 12) {
      hours = 0;
    }
    return [hours, minutes || 0];
  }
});
