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

  for (const url of calendarUrls) {
    try {
      // Create a new active tab for the URL
      const tab = await chrome.tabs.create({ url: url, active: true });

      // Wait for the tab to finish loading
      await new Promise(resolve => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });

      // A short additional delay for web apps that might still be rendering
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture the visible part of the tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      
      // The dataUrl is a base64 encoded PNG image.
      // We need to remove the prefix 'data:image/png;base64,'
      const base64Data = dataUrl.split(',')[1];
      
      console.log('Screenshot taken, sending to Gemini for analysis...');
      await analyzeScreenshot(base64Data);

      // Close the tab
      await chrome.tabs.remove(tab.id);

    } catch (error) {
      console.error(`Failed to process URL ${url}:`, error);
    }
  }
  console.log('All URLs processed.');
}


async function analyzeScreenshot(base64Data) {
  // Replace 'YOUR_API_KEY' with your actual Gemini API key.
  const apiKey = GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Analysis from Gemini:', JSON.stringify(data, null, 2));
    
    // Process and store the events
    processAndStoreEvents(data);

  } catch (error) {
    console.error('Error analyzing screenshot:', error);
  }
}

function processAndStoreEvents(geminiResponse) {
  try {
    // Extract the JSON string from the response
    const jsonString = geminiResponse.candidates[0].content.parts[0].text.replace(/```json\n|```/g, '');
    const events = JSON.parse(jsonString);

    if (Array.isArray(events)) {
      // Store the events
      chrome.storage.local.set({ calendarEvents: events }, () => {
        console.log('Calendar events stored successfully.');
      });
    }
  } catch (error) {
    console.error('Error processing or storing events:', error);
  }
}
