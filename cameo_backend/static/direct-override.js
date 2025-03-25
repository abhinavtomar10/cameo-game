// Direct Button Override
(function() {
    console.log("🔨 Direct Button Override Script Loaded");

    // Function to completely override the Start Game button with our own implementation
    function overrideStartGameButton() {
        console.log("🔍 Looking for Start Game button...");
        
        // Use MutationObserver to detect when the button is added to the DOM
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Check for button after nodes are added
                    setTimeout(checkForButton, 100);
                }
            });
        });
        
        // Start observing the body for changes
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Also try immediately
        checkForButton();
        
        // Check again after a delay to catch React rendering
        setTimeout(checkForButton, 1000);
        setTimeout(checkForButton, 2000);
        
        function checkForButton() {
            const buttons = document.querySelectorAll('button');
            for (let i = 0; i < buttons.length; i++) {
                if (buttons[i].textContent.includes('Start Game')) {
                    const startButton = buttons[i];
                    console.log("✅ Found Start Game button:", startButton);
                    
                    // Remove existing click handlers
                    const newButton = startButton.cloneNode(true);
                    startButton.parentNode.replaceChild(newButton, startButton);
                    
                    // Add our own handler
                    newButton.addEventListener('click', function(e) {
                        console.log("🎮 Start Game button clicked - DIRECT OVERRIDE");
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Show loading state
                        newButton.disabled = true;
                        newButton.textContent = "Starting...";
                        
                        // Use fetch with Railway URL
                        fetch(window.location.origin + '/api/start/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({})
                        })
                        .then(function(response) {
                            if (!response.ok) {
                                throw new Error('Network response was not ok: ' + response.status);
                            }
                            return response.json();
                        })
                        .then(function(data) {
                            console.log("🎯 Game started successfully:", data);
                            
                            // Manually call the functions that would normally be called by the React component
                            if (window.directGameStart) {
                                window.directGameStart(data);
                            } else {
                                console.log("⚠️ No directGameStart function found, refreshing page...");
                                window.location.reload();
                            }
                        })
                        .catch(function(error) {
                            console.error("❌ Start Game error:", error);
                            newButton.disabled = false;
                            newButton.textContent = "Start Game";
                            alert("Failed to start game. Error: " + error.message);
                        });
                        
                        return false;
                    });
                    
                    // Break observer
                    observer.disconnect();
                    return;
                }
            }
        }
    }

    // Make our DirectGameStart function globally available
    window.directGameStart = function(data) {
        console.log("📣 Calling direct game start with data:", data);
        // These functions will be populated by our React monkey patch
        if (window.__setGameCode && window.__setPlayer && window.__connectWebSocket) {
            window.__setGameCode(data.code);
            window.__setPlayer(1);
            window.__connectWebSocket(data.code);
        } else {
            // Fallback if our React functions aren't available
            console.log("⚠️ React functions not available, refreshing page...");
            window.location.reload();
        }
    };

    // Override React functions to expose them globally
    function monkeyPatchReact() {
        console.log("🐵 Setting up React monkey patch...");
        
        // This will run periodically to try to find and patch React's useState
        const checkInterval = setInterval(function() {
            if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
                clearInterval(checkInterval);
                console.log("🎯 Found React, attempting to patch...");
                
                try {
                    // When the App component runs, we'll intercept the useState calls
                    // to get references to the state setters we need
                    const originalCreateElement = React.createElement;
                    React.createElement = function(type, props, ...children) {
                        // If this is our App component, try to monkey patch it
                        if (type && type.name === 'App') {
                            console.log("🎯 Found App component, intercepting...");
                            const originalApp = type;
                            const patchedApp = function(props) {
                                console.log("🎯 App component rendering, intercepting state...");
                                const result = originalApp(props);
                                return result;
                            };
                            patchedApp.displayName = 'PatchedApp';
                            return originalCreateElement(patchedApp, props, ...children);
                        }
                        return originalCreateElement(type, props, ...children);
                    };
                } catch (e) {
                    console.error("❌ Failed to monkey patch React:", e);
                }
            }
        }, 500);
    }

    // Start overriding the button as soon as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', overrideStartGameButton);
    } else {
        overrideStartGameButton();
    }
    
    // Try to patch React
    monkeyPatchReact();
    
    // Also provide a completely different approach - override axios directly
    function patchAxios() {
        const originalPost = axios.post;
        
        axios.post = function(url, data, config) {
            console.log("🔄 Axios POST intercepted:", url);
            
            if (url === 'http://127.0.0.1:8000/api/start/') {
                console.log("🔨 Redirecting start game request to current origin");
                url = window.location.origin + '/api/start/';
            }
            
            if (url === 'http://127.0.0.1:8000/api/connect/') {
                console.log("🔨 Redirecting connect game request to current origin");
                url = window.location.origin + '/api/connect/';
            }
            
            return originalPost.call(this, url, data, config);
        };
        
        console.log("✅ Axios patch complete");
    }
    
    // Try to patch axios as soon as it's available
    if (window.axios) {
        patchAxios();
    } else {
        // Check periodically for axios
        const axiosCheckInterval = setInterval(function() {
            if (window.axios) {
                clearInterval(axiosCheckInterval);
                patchAxios();
            }
        }, 200);
        
        // Also stop checking after a while
        setTimeout(function() {
            clearInterval(axiosCheckInterval);
        }, 10000);
    }
    
    console.log("✅ Direct override script initialization complete");
})(); 