console.log("Close Window Extension: service worker loaded");

// VARS
const tabQty = {};                           // Track tab counts per window
const currentlyClosingWindows = new Set();   // Track windows being closed (avoid double-close)
let time = Date.now();                       // Global timestamp (updated as needed)



// MAIN

// Initialize tab counts for existing windows when service worker starts
chrome.windows.getAll({ populate: true }, (windows) => {
  windows.forEach((win) => {
    tabQty[win.id] = win.tabs.length;
    time = Date.now();
    console.log(`${formatTime(time)} - 🗔 Window #${win.id} initialized | tabs: ${win.tabs.length}`);
  });
});

// Track when a window is created
chrome.windows.onCreated.addListener((window) => {
  time = Date.now();
  updateTabCount(window.id);
  console.log(`${formatTime(time)} - 🗔 Window #${window.id} created     | tabs: ${tabQty[window.id]}`);
});

// Track when a tab is created
chrome.tabs.onCreated.addListener((tab) => {
  time = Date.now();
  const before = tabQty[tab.windowId] || 0; // tabs before creation
  updateTabCount(tab.windowId, (after) => {
    console.log(`${formatTime(time)} - ➕ Tab #${tab.id} created in window #${tab.windowId} | before: ${before}, after: ${after}`);
  });
});

// Track when a tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  time = Date.now();
  const before = tabQty[removeInfo.windowId] || 1; // tabs before removal
  updateTabCount(removeInfo.windowId, (after) => {
    console.log(`${formatTime(time)} - ❌ Tab #${tabId} closed  in window #${removeInfo.windowId} | before: ${before}, after: ${after}`);
    handleWindowClose(removeInfo.windowId, before, after);
  });
});



// FUNCTIONS

// Handle closing the window if only 1 tab was present
function handleWindowClose(windowId, before, after) {
  if (before === 1 && !currentlyClosingWindows.has(windowId)) {
    currentlyClosingWindows.add(windowId);
    console.log(`${formatTime(time)} - ⚠ Only 1 tab present — closing window #${windowId}`);
    chrome.windows.remove(windowId, () => {
      if (chrome.runtime.lastError) {
        console.warn(`${formatTime(time)} - ⚠  Could not close window #${windowId}: ${chrome.runtime.lastError.message}`);
      }
      currentlyClosingWindows.delete(windowId);
    });
  }
  updateTabCount(windowId);
}

// Update the tab count for a specific window
function updateTabCount(windowId, callback) {
  chrome.tabs.query({ windowId }, (tabs) => {
    tabQty[windowId] = tabs.length;
    time = Date.now();
    // console.log(`${formatTime(time)} - Window #${windowId} now has ${tabQty[windowId]} tab(s)`); // optional
    if (callback) callback(tabQty[windowId], tabs);
  });
}

// Format a timestamp into HH:mm:ss
function formatTime(ms) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
