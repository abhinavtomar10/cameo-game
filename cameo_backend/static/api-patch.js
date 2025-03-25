(function() {
    console.log('API Patch: Initializing API call interception');
    
    // Function to determine if a URL needs to be patched
    function shouldPatchUrl(url) {
        return (
            (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) && 
            !url.includes(window.location.host)
        );
    }
    
    // Function to patch a URL
    function patchUrl(url) {
        if (!shouldPatchUrl(url)) return url;
        
        console.log('API Patch: Fixing URL from', url);
        
        // Extract the path portion after the host
        let path = url;
        if (url.includes('//')) {
            path = url.split('//')[1].split('/').slice(1).join('/');
        }
        
        // Make sure we don't have duplicated 'api/' in the path
        if (path.startsWith('api/')) {
            path = path;
        } else if (path.includes('/api/')) {
            path = 'api/' + path.split('/api/')[1];
        }
        
        // Construct the new URL using the current origin
        const newUrl = window.location.origin + '/' + path;
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
    
    // Override axios if it exists
    if (window.axios) {
        const originalAxiosRequest = window.axios.request;
        window.axios.request = function(config) {
            if (config.url) {
                config.url = patchUrl(config.url);
            }
            return originalAxiosRequest.call(this, config);
        };
    }
    
    console.log('API Patch: API call interception initialized');
})(); 