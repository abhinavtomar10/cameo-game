// Final URL Interceptor
(function() {
  console.log("🔧 Final URL Interceptor activated");
  
  // Store original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalWS = window.WebSocket;
  
  // Helper to fix URLs
  function fixUrl(url) {
    if (typeof url !== 'string') return url;
    
    // Check if it's a localhost URL
    if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
      console.log("🔄 Rewriting URL:", url);
      
      if (url.startsWith('http')) {
        // For HTTP/HTTPS URLs
        const path = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, "");
        return window.location.origin + path;
      } else if (url.startsWith('ws')) {
        // For WebSocket URLs
        const path = url.replace(/^wss?:\/\/(localhost|127\.0\.0\.1):8000/, "");
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return protocol + '//' + window.location.host + path;
      }
    }
    
    return url;
  }
  
  // Patch fetch
  window.fetch = function(resource, options) {
    if (typeof resource === 'string') {
      resource = fixUrl(resource);
    } else if (resource && resource.url) {
      resource.url = fixUrl(resource.url);
    }
    return originalFetch.apply(this, arguments);
  };
  
  // Patch XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    url = fixUrl(url);
    return originalXHROpen.call(this, method, url, async, user, password);
  };
  
  // Patch WebSocket
  window.WebSocket = function(url, protocols) {
    url = fixUrl(url);
    return new originalWS(url, protocols);
  };
  window.WebSocket.prototype = originalWS.prototype;
  
  // Patch axios if it exists or when it loads
  function patchAxios() {
    if (window.axios) {
      console.log("🔧 Patching axios");
      const originalAxiosRequest = window.axios.request;
      
      window.axios.request = function(config) {
        if (config.url) {
          config.url = fixUrl(config.url);
        }
        return originalAxiosRequest.call(this, config);
      };
      
      // Patch convenience methods
      ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'].forEach(method => {
        const original = window.axios[method];
        window.axios[method] = function(url, ...args) {
          url = fixUrl(url);
          return original.call(this, url, ...args);
        };
      });
    }
  }
  
  // Try to patch axios now
  patchAxios();
  
  // And also when scripts load
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      element.addEventListener('load', function() {
        // Try to patch axios after script loads
        patchAxios();
      });
    }
    
    return element;
  };
  
  // Direct button fix
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      const startButton = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Start Game'));
      
      if (startButton) {
        console.log("🔧 Adding safety click handler to Start Game button");
        
        // Wrap existing handler
        const originalOnClick = startButton.onclick;
        startButton.addEventListener('click', function(e) {
          try {
            // Try our own implementation first
            fetch(window.location.origin + '/api/start/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            })
            .then(r => r.json())
            .then(data => {
              console.log("Game started successfully:", data);
              // Let the regular handler continue with this data
              window.gameStartResponse = data;
            })
            .catch(err => {
              console.error("Failed to start game:", err);
              // Fall through to original handler
            });
          } catch (err) {
            console.error("Error in safety handler:", err);
          }
        }, true); // Use capture to run before other handlers
      }
    }, 1000);  // Wait for React to render
  });
  
  console.log("✅ URL Interceptor initialization complete");
})(); 