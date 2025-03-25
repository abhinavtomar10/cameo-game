// This script ensures axios is patched immediately and helps with early loading issues

(function() {
    if (!window.axiosPatcherLoaded) {
        window.axiosPatcherLoaded = true;
        console.log("Preloading axios patch...");
        
        // Make a dummy axios object if it's not defined yet
        if (!window.axios) {
            window.axios = {};
        }
        
        // Setup function to patch real axios when it loads
        window.patchRealAxios = function() {
            console.log("Patching real axios instance");
            if (window.originalAxios) {
                // Already patched
                return;
            }
            
            if (window.axios && window.axios.post) {
                console.log("Found real axios, applying patches");
                
                // Store the original axios for reference
                window.originalAxios = Object.assign({}, window.axios);
                
                const patchUrl = function(url) {
                    if (typeof url !== 'string') return url;
                    
                    if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
                        console.log("Detected hardcoded URL:", url);
                        const newUrl = url.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):8000/g, window.location.origin);
                        console.log("Replaced with:", newUrl);
                        return newUrl;
                    }
                    return url;
                };
                
                // Patch main axios methods
                const methods = ['get', 'post', 'put', 'delete', 'patch', 'head'];
                methods.forEach(method => {
                    if (typeof window.axios[method] === 'function') {
                        const original = window.axios[method];
                        window.axios[method] = function(url, ...args) {
                            return original.call(this, patchUrl(url), ...args);
                        };
                    }
                });
                
                // Also patch axios.request directly
                if (typeof window.axios.request === 'function') {
                    const originalRequest = window.axios.request;
                    window.axios.request = function(config) {
                        if (config && config.url) {
                            config.url = patchUrl(config.url);
                        }
                        return originalRequest.call(this, config);
                    };
                }
                
                // Try to replay any early calls that were made before axios loaded
                if (window.earlyAxiosCalls && window.earlyAxiosCalls.length) {
                    console.log("Replaying", window.earlyAxiosCalls.length, "early axios calls");
                    window.earlyAxiosCalls.forEach(call => {
                        if (window.axios[call.method]) {
                            console.log("Replaying", call.method, "to", call.url);
                            window.axios[call.method](call.url, ...call.args)
                                .catch(err => console.error("Error replaying early call:", err));
                        }
                    });
                }
            }
        };
        
        // Try to patch immediately, then set up interval to check again
        window.patchRealAxios();
        
        const checkInterval = setInterval(function() {
            if (window.axios && window.axios.post && !window.originalAxios) {
                window.patchRealAxios();
                clearInterval(checkInterval);
            }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(function() {
            clearInterval(checkInterval);
        }, 10000);
    }
})(); 