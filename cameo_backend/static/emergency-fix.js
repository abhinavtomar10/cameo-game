/**
 * EMERGENCY FIX SCRIPT
 * 
 * This script is specifically designed to resolve the issue with
 * hardcoded http://127.0.0.1:8000/api/start/ URLs in the React bundle
 * that are causing problems in the Railway deployment environment.
 */

(function() {
  console.log("🚑 EMERGENCY-FIX: Loading emergency protocol fix script");
  
  // STEP 1: Save original methods
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  
  // STEP 2: Override fetch to redirect specific problematic URLs
  window.fetch = function(url, options) {
    // Handle both string URLs and Request objects
    let actualUrl = url;
    
    if (url instanceof Request) {
      actualUrl = url.url;
      // We need to create a new Request with the fixed URL
      if (actualUrl.includes('127.0.0.1:8000/api/start') || 
          actualUrl.includes('localhost:8000/api/start')) {
        console.log("🚑 EMERGENCY-FIX: Intercepted fetch Request to localhost:", actualUrl);
        const newUrl = window.location.origin + '/api/start/';
        
        // Create a new request with the fixed URL
        const newRequest = new Request(newUrl, url);
        console.log("🚑 EMERGENCY-FIX: Redirecting to:", newUrl);
        return originalFetch.call(this, newRequest, options);
      }
    } else if (typeof url === 'string') {
      if (url.includes('127.0.0.1:8000/api/start') || 
          url.includes('localhost:8000/api/start')) {
        console.log("🚑 EMERGENCY-FIX: Intercepted fetch string URL to localhost:", url);
        actualUrl = window.location.origin + '/api/start/';
        console.log("🚑 EMERGENCY-FIX: Redirecting to:", actualUrl);
      }
    }
    
    return originalFetch.call(this, actualUrl, options);
  };
  
  // STEP 3: Override XMLHttpRequest to handle the problematic endpoint
  XMLHttpRequest.prototype.open = function() {
    let method = arguments[0];
    let url = arguments[1];
    
    // Check if this is a request to our problematic endpoint
    if (typeof url === 'string' && 
        (url.includes('127.0.0.1:8000/api/start') || 
         url.includes('localhost:8000/api/start'))) {
      console.log("🚑 EMERGENCY-FIX: Intercepted XMLHttpRequest to localhost:", url);
      arguments[1] = window.location.origin + '/api/start/';
      console.log("🚑 EMERGENCY-FIX: Redirecting to:", arguments[1]);
    }
    
    return originalXHROpen.apply(this, arguments);
  };
  
  // STEP 4: Direct override for axios.post for the specific endpoint
  function patchAxios() {
    if (window.axios && window.axios.post) {
      console.log("🚑 EMERGENCY-FIX: Found axios, applying emergency patch");
      
      const originalPost = window.axios.post;
      window.axios.post = function(url, data, config) {
        if (url === 'http://127.0.0.1:8000/api/start/') {
          console.log("🚑 EMERGENCY-FIX: Intercepted direct axios.post call to localhost");
          
          // Force a direct fetch implementation instead of using axios
          console.log("🚑 EMERGENCY-FIX: Using direct fetch implementation");
          return fetch(window.location.origin + '/api/start/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data || {})
          })
          .then(response => response.json())
          .then(data => {
            console.log("🚑 EMERGENCY-FIX: Game successfully created with code:", data.code);
            
            // Try to update React state directly if possible
            if (window.setGameCode) window.setGameCode(data.code);
            if (window.setPlayer) window.setPlayer(1);
            if (window.connectWebSocket) window.connectWebSocket(data.code);
            
            return data;
          });
        }
        
        return originalPost.call(this, url, data, config);
      };
    }
  }
  
  // Try to patch axios immediately
  patchAxios();
  
  // Also set an interval to patch axios in case it loads later
  const axiosCheckInterval = setInterval(function() {
    if (window.axios && window.axios.post) {
      patchAxios();
      clearInterval(axiosCheckInterval);
    }
  }, 100);
  
  // Clear the interval after 10 seconds to avoid memory leaks
  setTimeout(function() {
    clearInterval(axiosCheckInterval);
  }, 10000);
  
  // STEP 5: Start button override - look for the button and hijack its click
  function setupButtonOverride() {
    setTimeout(function() {
      console.log("🚑 EMERGENCY-FIX: Setting up Start Game button override");
      
      // Find any button that looks like it might be the Start Game button
      const buttons = document.querySelectorAll('button');
      buttons.forEach(function(button) {
        if (button.innerText && button.innerText.trim() === 'Start Game') {
          console.log("🚑 EMERGENCY-FIX: Found Start Game button, setting up direct handler");
          
          // Replace the button to remove all event listeners
          const parent = button.parentNode;
          const newButton = button.cloneNode(true);
          
          // Add our direct handler
          newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("🚑 EMERGENCY-FIX: Start Game button clicked, handling directly");
            
            // Make a direct fetch call to start the game
            fetch(window.location.origin + '/api/start/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
              console.log("🚑 EMERGENCY-FIX: Game successfully created with code:", data.code);
              
              // Try to update React state
              if (window.setGameCode) window.setGameCode(data.code);
              if (window.setPlayer) window.setPlayer(1);
              if (window.connectWebSocket) window.connectWebSocket(data.code);
              
              // Show an alert with the game code in case state update fails
              alert("Game created! Your code is: " + data.code);
            })
            .catch(error => {
              console.error("🚑 EMERGENCY-FIX: Error starting game:", error);
              alert("Error starting game: " + error.message);
            });
            
            return false;
          });
          
          // Replace the button
          if (parent) {
            parent.replaceChild(newButton, button);
            console.log("🚑 EMERGENCY-FIX: Successfully replaced button with direct handler");
          }
        }
      });
    }, 2000);
  }
  
  // Set up button override when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupButtonOverride);
  } else {
    setupButtonOverride();
  }
  
  // Also set up a backup attempt after window load
  window.addEventListener('load', setupButtonOverride);
  
  // Set up a global function to help debug API calls
  window.debugApiConfig = function() {
    console.log("🚑 EMERGENCY-FIX: Current origin:", window.location.origin);
    console.log("🚑 EMERGENCY-FIX: Expected API URL:", window.location.origin + "/api/start/");
    
    // Test a direct call to the API
    fetch(window.location.origin + '/api/start/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    .then(response => {
      console.log("🚑 EMERGENCY-FIX: Test API call response status:", response.status);
      return response.json();
    })
    .then(data => {
      console.log("🚑 EMERGENCY-FIX: Test API call data:", data);
    })
    .catch(error => {
      console.error("🚑 EMERGENCY-FIX: Test API call error:", error);
    });
  };
  
  console.log("🚑 EMERGENCY-FIX: Emergency protocol fix script loaded successfully");
})(); 