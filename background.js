importScripts('config.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureAndAnalyze') {
    captureAndAnalyzeTabs();
    return true; // Indicates that the response is sent asynchronously
  }
});

async function captureAndAnalyzeTabs() {
  const { calendarUrls } = await chrome.storage.sync.get('calendarUrls');
  if (!calendarUrls || calendarUrls.length === 0) {
    console.log('No URLs to process.');
    return;
  }

  let allEvents = []; // Initialize an array to accumulate events from all URLs

  for (const url of calendarUrls) {
    try {
      const tab = await chrome.tabs.create({ url: url, active: true });

      await new Promise(resolve => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      const base64Data = dataUrl.split(',')[1];
      
      console.log(`Screenshot taken for ${url}, sending for analysis...`);
      const newEvents = await analyzeScreenshot(base64Data); // Get events from this URL
      
      if (newEvents && Array.isArray(newEvents)) {
        allEvents = allEvents.concat(newEvents); // Append new events to the main list
      }

      await chrome.tabs.remove(tab.id);

    } catch (error) {
      console.error(`Failed to process URL ${url}:`, error);
    }
  }

  // After processing all URLs, save the complete list of events to storage
  chrome.storage.local.set({ calendarEvents: allEvents }, () => {
    console.log('All URLs processed and combined events stored:', allEvents);
  });
}

async function analyzeScreenshot(base64Data) {
  const apiKey = GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
    "contents": [
      {
        "parts": [
          { "text": "Extract all event details from this calendar screenshot. For each event, provide the title, date, and time. Respond in JSON format." },
          {
            "inline_data": {
              "mime_type": "image/png",
              "data": base64Data
            }
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      console.error('Invalid response structure from Gemini:', data);
      return [];
    }

    const jsonString = data.candidates[0].content.parts[0].text.replace(/```json\n|```/g, '');
    
    try {
      const events = JSON.parse(jsonString);
      console.log('Successfully parsed events from Gemini.');
      return events; // Return the parsed events
    } catch (parseError) {
      console.error('Failed to parse JSON from Gemini response:', parseError);
      console.error('Problematic JSON string:', jsonString);
      return [];
    }

  } catch (error) {
    console.error('Error analyzing screenshot:', error);
    return []; // Return an empty array on error
  }
}
