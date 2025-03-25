console.log('🛠️ Loading extreme-debug.js script...');

// Log environment information
(function logEnvironmentInfo() {
  console.log('🌐 Current Location:', window.location.href);
  console.log('🔗 Origin:', window.location.origin);
  console.log('🌐 Protocol:', window.location.protocol);
  console.log('🏠 Host:', window.location.host);
  console.log('📑 Pathname:', window.location.pathname);
  console.log('🔍 User Agent:', navigator.userAgent);
  console.log('📱 Is Mobile:', /Mobi|Android/i.test(navigator.userAgent));
})();

// Debug helper to format objects nicely
function prettyFormat(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

// Log all scripts loaded on the page
(function logLoadedScripts() {
  const scripts = document.querySelectorAll('script');
  console.log(`📜 Loaded Scripts (${scripts.length}):`);
  scripts.forEach((script, index) => {
    console.log(`Script #${index + 1}:`, script.src || 'Inline script');
  });
  
  // Also watch for dynamically added scripts
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.apply(document, arguments);
    if (tagName.toLowerCase() === 'script') {
      // Monitor script attribute changes
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        const result = originalSetAttribute.apply(this, arguments);
        if (name === 'src') {
          console.log('🔄 Dynamic script src set:', value);
        }
        return result;
      };
      
      // Monitor script insertion
      setTimeout(() => {
        if (element.parentNode) {
          console.log('🔄 Dynamic script inserted:', element.src || 'Inline script');
        }
      }, 0);
    }
    return element;
  };
})();

// Intercept and log all fetch requests
(function interceptFetch() {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    const url = resource instanceof Request ? resource.url : resource;
    const method = init?.method || (resource instanceof Request ? resource.method : 'GET');
    
    console.log(`🌐 Fetch Request: ${method} ${url}`);
    if (init?.body) {
      try {
        console.log('📦 Fetch Request Body:', typeof init.body === 'string' ? JSON.parse(init.body) : init.body);
      } catch (e) {
        console.log('📦 Fetch Request Body (raw):', init.body);
      }
    }
    
    try {
      const response = await originalFetch.apply(this, arguments);
      
      // Clone the response to avoid consuming it
      const clonedResponse = response.clone();
      
      console.log(`✅ Fetch Response: ${response.status} ${response.statusText} for ${url}`);
      
      // Try to log the response body if possible
      clonedResponse.text().then(text => {
        try {
          const json = JSON.parse(text);
          console.log('📦 Fetch Response Body:', json);
        } catch (e) {
          if (text.length < 500) {
            console.log('📦 Fetch Response Text:', text);
          } else {
            console.log('📦 Fetch Response Text (truncated):', text.substring(0, 500) + '...');
          }
        }
      }).catch(err => {
        console.log('⚠️ Could not read fetch response body:', err);
      });
      
      return response;
    } catch (error) {
      console.error(`🚨 Fetch Error for ${url}:`, error);
      throw error;
    }
  };
})();

// Intercept and log all XMLHttpRequest requests
(function interceptXHR() {
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._debugMethod = method;
    this._debugUrl = url;
    return originalXHROpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    console.log(`🌐 XHR Request: ${this._debugMethod} ${this._debugUrl}`);
    
    if (body) {
      try {
        console.log('📦 XHR Request Body:', typeof body === 'string' ? JSON.parse(body) : body);
      } catch (e) {
        console.log('📦 XHR Request Body (raw):', body);
      }
    }
    
    this.addEventListener('load', function() {
      console.log(`✅ XHR Response: ${this.status} for ${this._debugUrl}`);
      
      try {
        if (this.responseType === '' || this.responseType === 'text') {
          try {
            const json = JSON.parse(this.responseText);
            console.log('📦 XHR Response Body:', json);
          } catch (e) {
            if (this.responseText.length < 500) {
              console.log('📦 XHR Response Text:', this.responseText);
            } else {
              console.log('📦 XHR Response Text (truncated):', this.responseText.substring(0, 500) + '...');
            }
          }
        } else {
          console.log('📦 XHR Response (binary or non-text)');
        }
      } catch (e) {
        console.log('⚠️ Could not read XHR response:', e);
      }
    });
    
    this.addEventListener('error', function() {
      console.error(`🚨 XHR Error for ${this._debugUrl}`);
    });
    
    return originalXHRSend.apply(this, arguments);
  };
})();

// Intercept WebSocket connections
(function interceptWebSocket() {
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('🔌 WebSocket Connection Attempt:', url);
    
    const ws = new OriginalWebSocket(url, protocols);
    
    ws.addEventListener('open', function() {
      console.log('✅ WebSocket Connected:', url);
    });
    
    ws.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('📩 WebSocket Message:', data);
      } catch (e) {
        console.log('📩 WebSocket Message (raw):', event.data);
      }
    });
    
    ws.addEventListener('error', function(event) {
      console.error('🚨 WebSocket Error:', url, event);
    });
    
    ws.addEventListener('close', function(event) {
      console.log('🔌 WebSocket Closed:', url, 'Code:', event.code, 'Reason:', event.reason);
    });
    
    return ws;
  };
})();

// Helper to patch any URLs that might be hardcoded
(function patchHardcodedURLs() {
  const currentOrigin = window.location.origin;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const wsOrigin = currentOrigin.replace(/^https?:/, wsProtocol);
  
  // Replace hardcoded URLs in axios calls
  if (window.axios) {
    const originalPost = window.axios.post;
    window.axios.post = function(url, data, config) {
      if (typeof url === 'string' && 
          (url.includes('127.0.0.1:8000') || url.includes('localhost:8000'))) {
        console.log('🔄 Replacing hardcoded URL in axios call:', url);
        url = url.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, currentOrigin);
      }
      return originalPost.call(this, url, data, config);
    };
  }
  
  // Replace hardcoded URLs in WebSocket
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (typeof url === 'string' && 
        (url.includes('127.0.0.1:8000') || url.includes('localhost:8000'))) {
      console.log('🔄 Replacing hardcoded URL in WebSocket:', url);
      url = url.replace(/wss?:\/\/(localhost|127\.0\.0\.1):8000/g, wsOrigin);
    }
    return new OriginalWebSocket(url, protocols);
  };
  
  console.log('🔄 URL Patching System Activated');
})();

// Monitor button clicks
(function monitorButtonClicks() {
  document.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON') {
      console.log('🖱️ Button Clicked:', event.target.textContent || event.target.id || 'unnamed button');
    }
  }, true);
})();

// Monitor form submissions
(function monitorFormSubmissions() {
  const originalSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function() {
    console.log('📝 Form Submit:', this.action || 'no action specified');
    return originalSubmit.apply(this, arguments);
  };
  
  document.addEventListener('submit', function(event) {
    console.log('📝 Form Submit Event:', event.target.action || 'no action specified');
  }, true);
})();

// Check if server is reachable
(function checkServerConnection() {
  fetch(window.location.origin + '/api/health/', { 
    method: 'GET', 
    cache: 'no-store' 
  })
    .then(response => {
      console.log(`🔍 Server health check: ${response.status}`);
      return response.text();
    })
    .then(text => {
      console.log(`🔍 Server response: ${text.substring(0, 100)}`);
    })
    .catch(error => {
      console.error(`🚨 Server health check failed:`, error);
    });
})();

// Watch for DOM mutations that might be related to the game
(function watchDOMChanges() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.classList && (
                node.classList.contains('game-board') || 
                node.classList.contains('player-cards') ||
                node.querySelector('.game-board') ||
                node.querySelector('.player-cards')
            )) {
              console.log('🎮 Game UI Element Added:', node.classList.toString());
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
})();

console.log('🛠️ extreme-debug.js loaded and initialized'); 