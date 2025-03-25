(function() {
    console.log('API Patch: Initializing API call interception');
    
    // Function to determine if a URL needs to be patched
    function shouldPatchUrl(url) {
        if (typeof url !== 'string') return false;
        return (
            url.includes('127.0.0.1:8000') || 
            url.includes('localhost:8000') ||
            url.startsWith('http://127.0.0.1:8000') ||
            url.startsWith('http://localhost:8000') ||
            url.startsWith('ws://127.0.0.1:8000') ||
            url.startsWith('ws://localhost:8000')
        );
    }
    
    // Function to patch a URL
    function patchUrl(url) {
        if (!shouldPatchUrl(url)) return url;
        
        console.log('API Patch: Fixing URL from', url);
        
        // Handle WebSocket URLs
        if (url.startsWith('ws://')) {
            const wsUrl = 'ws://' + window.location.host + url.substring('ws://127.0.0.1:8000'.length);
            console.log('API Patch: Fixed WebSocket URL to', wsUrl);
            return wsUrl;
        }
        
        // Handle HTTP URLs
        let origin = window.location.origin;
        let path = '';
        
        // Extract the path portion after the host
        if (url.includes('//')) {
            const parts = url.split('//');
            const hostAndPath = parts[1].split('/');
            path = '/' + hostAndPath.slice(1).join('/');
        } else {
            path = url;
        }
        
        // Make sure leading slash exists
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        const newUrl = origin + path;
        console.log('API Patch: Fixed URL to', newUrl);
        return newUrl;
    }
    
    // Override fetch
    const originalFetch = window.fetch;
    window.fetch = function(resource, options) {
        if (typeof resource === 'string') {
            resource = patchUrl(resource);
        } else if (resource instanceof Request) {
            resource = new Request(
                patchUrl(resource.url),
                resource
            );
        }
        return originalFetch.call(this, resource, options);
    };
    
    // Override XMLHttpRequest open method
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        const patchedUrl = patchUrl(url);
        return originalXhrOpen.call(this, method, patchedUrl, async, user, password);
    };
    
    // Override WebSocket constructor
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        const patchedUrl = patchUrl(url);
        return new OriginalWebSocket(patchedUrl, protocols);
    };
    
    // Add Axios specific override
    console.log('API Patch: Looking for axios to patch');
    
    // Wait for axios to be available if not already
    function patchAxios() {
        if (window.axios) {
            console.log('API Patch: Found axios, patching...');
            
            // Store the original methods
            const originalPost = window.axios.post;
            const originalGet = window.axios.get;
            const originalPut = window.axios.put;
            const originalDelete = window.axios.delete;
            
            // Override axios.post
            window.axios.post = function(url, data, config) {
                console.log('API Patch: Caught axios.post to:', url);
                return originalPost.call(this, patchUrl(url), data, config);
            };
            
            // Override axios.get
            window.axios.get = function(url, config) {
                console.log('API Patch: Caught axios.get to:', url);
                return originalGet.call(this, patchUrl(url), config);
            };
            
            // Override axios.put
            window.axios.put = function(url, data, config) {
                console.log('API Patch: Caught axios.put to:', url);
                return originalPut.call(this, patchUrl(url), data, config);
            };
            
            // Override axios.delete
            window.axios.delete = function(url, config) {
                console.log('API Patch: Caught axios.delete to:', url);
                return originalDelete.call(this, patchUrl(url), config);
            };
            
            console.log('API Patch: Successfully patched axios methods');
            return true;
        }
        return false;
    }
    
    // Try to patch immediately, and also set a retry if axios loads later
    if (!patchAxios()) {
        console.log('API Patch: Axios not found initially, will retry later');
        const checkInterval = setInterval(function() {
            if (patchAxios()) {
                console.log('API Patch: Successfully patched axios on retry');
                clearInterval(checkInterval);
            }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(function() {
            clearInterval(checkInterval);
        }, 10000);
    }
    
    console.log('API Patch: API call interception initialized');
})(); 