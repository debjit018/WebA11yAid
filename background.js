// WebA11yAid - Background Service Worker
console.log('WebA11yAid background service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('WebA11yAid extension installed');
  
  // Set default settings
  chrome.storage.local.set({
    autoScan: true,
    showOutlines: true,
    highlightIssues: true,
    lastScan: null
  });
  
  // Create context menu items
  chrome.contextMenus.create({
    id: "scanPage",
    title: "Scan with WebA11yAid",
    contexts: ["page"]
  });
  
  chrome.contextMenus.create({
    id: "scanElement",
    title: "Check accessibility",
    contexts: ["link", "image", "video", "audio"]
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "scanPage") {
    chrome.tabs.sendMessage(tab.id, {action: "scanPage"});
  } else if (info.menuItemId === "scanElement") {
    chrome.tabs.sendMessage(tab.id, {
      action: "scanElement", 
      elementUrl: info.srcUrl || info.linkUrl
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSettings") {
    chrome.storage.local.get(['autoScan', 'showOutlines', 'highlightIssues'], function(result) {
      sendResponse(result);
    });
    return true; // Indicates we will send response asynchronously
  }
  
  if (request.action === "saveSettings") {
    chrome.storage.local.set(request.settings, function() {
      sendResponse({success: true});
    });
    return true;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function(tab) {
  // This will automatically open the popup (defined in manifest)
  console.log('Extension icon clicked');
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
  if (command === "scan-page") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "scanPage"});
      }
    });
  }
});

// Keep service worker alive
let keepAlive = setInterval(() => {
  console.log('WebA11yAid service worker keeping alive');
}, 1000 * 60 * 4); // Every 4 minutes

// Clean up when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  clearInterval(keepAlive);
  console.log('WebA11yAid service worker shutting down');
});