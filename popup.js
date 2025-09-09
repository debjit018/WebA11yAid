document.addEventListener('DOMContentLoaded', function() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Show active tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabName}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // Get current tab and scan for issues
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    
    // Send message to content script to get accessibility issues
    chrome.tabs.sendMessage(activeTab.id, {action: "getIssues"}, function(response) {
      if (response && response.issues) {
        displayIssues(response.issues);
      } else {
        // If no response, request a new scan
        chrome.tabs.sendMessage(activeTab.id, {action: "scanPage"});
      }
    });
  });
  
  // Rescan button
  document.getElementById('scan-btn').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {action: "scanPage"});
      
      // Update status
      document.getElementById('status').textContent = "Scanning...";
      document.getElementById('issues-list').innerHTML = "";
    });
  });
  
  // Simulation controls
  const blurSlider = document.getElementById('blur-slider');
  const blurValue = document.getElementById('blur-value');
  const contrastSlider = document.getElementById('contrast-slider');
  const contrastValue = document.getElementById('contrast-value');
  const dyslexiaToggle = document.getElementById('dyslexia-toggle');
  const colorblindToggle = document.getElementById('colorblind-toggle');
  
  blurSlider.addEventListener('input', function() {
    blurValue.textContent = `${this.value}px`;
    applySimulation('blur', this.value);
  });
  
  contrastSlider.addEventListener('input', function() {
    contrastValue.textContent = `${this.value}%`;
    applySimulation('contrast', this.value);
  });
  
  dyslexiaToggle.addEventListener('change', function() {
    applySimulation('dyslexia', this.checked);
  });
  
  colorblindToggle.addEventListener('change', function() {
    applySimulation('colorblind', this.checked);
  });
  
  // Reset simulations
  document.getElementById('reset-simulations').addEventListener('click', function() {
    blurSlider.value = 0;
    contrastSlider.value = 100;
    dyslexiaToggle.checked = false;
    colorblindToggle.checked = false;
    blurValue.textContent = "0px";
    contrastValue.textContent = "100%";
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "resetSimulations"});
    });
  });
  
  // Settings controls
  document.getElementById('auto-scan').addEventListener('change', function() {
    chrome.storage.local.set({autoScan: this.checked});
  });
  
  document.getElementById('show-outlines').addEventListener('change', function() {
    chrome.storage.local.set({showOutlines: this.checked});
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleOutlines",
        show: this.checked
      });
    }.bind(this));
  });
  
  document.getElementById('highlight-issues').addEventListener('change', function() {
    chrome.storage.local.set({highlightIssues: this.checked});
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleHighlight",
        show: this.checked
      });
    }.bind(this));
  });
  
  // Load saved settings
  chrome.storage.local.get(['autoScan', 'showOutlines', 'highlightIssues'], function(result) {
    document.getElementById('auto-scan').checked = result.autoScan !== false;
    document.getElementById('show-outlines').checked = result.showOutlines !== false;
    document.getElementById('highlight-issues').checked = result.highlightIssues !== false;
  });
  
  // Function to apply simulation
  function applySimulation(type, value) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "applySimulation",
        type: type,
        value: value
      });
    });
  }
  
  // Function to display issues in the popup
  function displayIssues(issues) {
    const issuesList = document.getElementById('issues-list');
    issuesList.innerHTML = '';
    
    if (issues.length === 0) {
      issuesList.innerHTML = '<div class="issue-item success">No accessibility issues found!</div>';
      document.getElementById('status').textContent = "No issues found";
      return;
    }
    
    document.getElementById('status').textContent = `${issues.length} issues found`;
    
    issues.forEach(issue => {
      const issueElement = document.createElement('div');
      let severityClass = 'warning';
      
      if (issue.severity === 'high') {
        severityClass = '';
      } else if (issue.severity === 'low') {
        severityClass = 'success';
      }
      
      issueElement.className = `issue-item ${severityClass}`;
      issueElement.innerHTML = `
        <strong>${issue.type}</strong>: ${issue.message}
        ${issue.element ? `<div>Element: ${issue.element}</div>` : ''}
      `;
      
      issuesList.appendChild(issueElement);
    });
  }
});