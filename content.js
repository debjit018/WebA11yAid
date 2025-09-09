// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "scanPage") {
    const issues = scanPageForAccessibilityIssues();
    sendResponse({issues: issues});
  } else if (request.action === "getIssues") {
    // Return cached issues if available
    const issues = window.a11yIssues || [];
    sendResponse({issues: issues});
  } else if (request.action === "applySimulation") {
    applySimulation(request.type, request.value);
  } else if (request.action === "resetSimulations") {
    resetSimulations();
  } else if (request.action === "toggleOutlines") {
    toggleOutlines(request.show);
  } else if (request.action === "toggleHighlight") {
    toggleHighlight(request.show);
  }
  
  return true;
});

// Scan the page for accessibility issues
function scanPageForAccessibilityIssues() {
  const issues = [];
  
  // Check for missing alt text
  document.querySelectorAll('img:not([alt]), img[alt=""]').forEach(img => {
    issues.push({
      type: 'Missing alt text',
      message: 'Image is missing alternative text',
      element: getElementSelector(img),
      severity: 'high'
    });
  });
  
  // Check for missing form labels
  document.querySelectorAll('input:not([id]), select:not([id]), textarea:not([id])').forEach(input => {
    if (!input.labels || input.labels.length === 0) {
      issues.push({
        type: 'Missing form label',
        message: 'Form input is missing a label',
        element: getElementSelector(input),
        severity: 'high'
      });
    }
  });
  
  // Check for low contrast text
  document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6').forEach(el => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;
    
    if (color && bgColor && color !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgba(0, 0, 0, 0)') {
      const contrast = getContrastRatio(color, bgColor);
      if (contrast < 4.5) {
        issues.push({
          type: 'Low contrast',
          message: `Text contrast ratio is ${contrast.toFixed(2)}:1 (should be at least 4.5:1)`,
          element: getElementSelector(el),
          severity: 'medium'
        });
      }
    }
  });
  
  // Check for missing document language
  if (!document.documentElement.lang) {
    issues.push({
      type: 'Missing language attribute',
      message: 'Document is missing language attribute',
      element: 'html',
      severity: 'high'
    });
  }
  
  // Check for empty links
  document.querySelectorAll('a[href]:not([aria-label]):not([aria-labelledby])').forEach(link => {
    if (!link.textContent.trim() && !link.querySelector('img')) {
      issues.push({
        type: 'Empty link',
        message: 'Link contains no text content',
        element: getElementSelector(link),
        severity: 'medium'
      });
    }
  });
  
  // Cache the issues for later retrieval
  window.a11yIssues = issues;
  
  // Highlight issues on page if enabled
  chrome.storage.local.get(['highlightIssues'], function(result) {
    if (result.highlightIssues !== false) {
      highlightIssues(issues);
    }
  });
  
  return issues;
}

// Apply accessibility simulation
function applySimulation(type, value) {
  if (type === 'blur') {
    document.body.style.filter = `blur(${value}px)`;
  } else if (type === 'contrast') {
    document.body.style.filter = `contrast(${value}%)`;
  } else if (type === 'dyslexia') {
    if (value) {
      document.body.classList.add('dyslexia-simulation');
    } else {
      document.body.classList.remove('dyslexia-simulation');
    }
  } else if (type === 'colorblind') {
    if (value) {
      document.body.classList.add('protanopia-simulation');
    } else {
      document.body.classList.remove('protanopia-simulation');
    }
  }
}

// Reset all simulations
function resetSimulations() {
  document.body.style.filter = '';
  document.body.classList.remove('dyslexia-simulation');
  document.body.classList.remove('protanopia-simulation');
}

// Toggle element outlines
function toggleOutlines(show) {
  if (show) {
    document.body.classList.add('show-a11y-outlines');
  } else {
    document.body.classList.remove('show-a11y-outlines');
  }
}

// Toggle issue highlighting
function toggleHighlight(show) {
  if (show) {
    highlightIssues(window.a11yIssues || []);
  } else {
    // Remove all highlights
    document.querySelectorAll('.a11y-issue-highlight').forEach(el => {
      el.classList.remove('a11y-issue-highlight');
    });
  }
}

// Highlight elements with issues
function highlightIssues(issues) {
  // First remove any existing highlights
  document.querySelectorAll('.a11y-issue-highlight').forEach(el => {
    el.classList.remove('a11y-issue-highlight');
  });
  
  // Add highlights to elements with issues
  issues.forEach(issue => {
    if (issue.element && issue.element !== 'html') {
      try {
        const elements = document.querySelectorAll(issue.element);
        elements.forEach(el => {
          el.classList.add('a11y-issue-highlight');
        });
      } catch (e) {
        console.warn('Could not highlight element:', issue.element, e);
      }
    }
  });
}

// Helper function to get CSS selector for an element
function getElementSelector(el) {
  if (el.id) {
    return `#${el.id}`;
  }
  
  let selector = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    selector += '.' + el.className.split(' ').join('.');
  }
  
  return selector;
}

// Helper function to calculate contrast ratio
function getContrastRatio(color1, color2) {
  // Simplified contrast calculation - in a real implementation,
  // you would convert colors to luminance values first
  return 4.5; // Placeholder
}

// Add CSS for highlighting and simulations
const style = document.createElement('style');
style.textContent = `
  .a11y-issue-highlight {
    outline: 2px solid #ef4444 !important;
    position: relative;
  }
  
  .a11y-issue-highlight::after {
    content: 'Accessibility Issue';
    position: absolute;
    top: -20px;
    left: 0;
    background: #ef4444;
    color: white;
    padding: 2px 5px;
    font-size: 10px;
    z-index: 10000;
  }
  
  .show-a11y-outlines * {
    outline: 1px solid rgba(0, 0, 0, 0.1) !important;
  }
  
  .dyslexia-simulation {
    font-family: Comic Sans MS, cursive !important;
    letter-spacing: 1px !important;
    line-height: 1.8 !important;
  }
  
  .protanopia-simulation {
    filter: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" /></filter></svg>#protanopia') !important;
  }
`;
document.head.appendChild(style);

// Initial page scan if auto-scan is enabled
chrome.storage.local.get(['autoScan'], function(result) {
  if (result.autoScan !== false) {
    // Wait for page to load completely
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanPageForAccessibilityIssues);
    } else {
      setTimeout(scanPageForAccessibilityIssues, 1000);
    }
  }
});

// Add outlines if enabled
chrome.storage.local.get(['showOutlines'], function(result) {
  if (result.showOutlines !== false) {
    toggleOutlines(true);
  }
});