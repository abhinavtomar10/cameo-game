(function(window) {
    try {
        // Define the base API URL using the current origin
        const apiBaseUrl = window.location.origin;
        console.log('Setting API base URL to:', apiBaseUrl);
        
        // Make this configuration globally available
        window.ENV_CONFIG = {
            API_BASE_URL: apiBaseUrl,
            DEBUG: false
        };
        
        // Also expose a helper function for making API calls
        window.getApiUrl = function(endpoint) {
            // Remove leading slash if present
            if (endpoint.startsWith('/')) {
                endpoint = endpoint.substring(1);
            }
            // Make sure 'api/' is in the path
            if (!endpoint.startsWith('api/')) {
                endpoint = 'api/' + endpoint;
            }
            return apiBaseUrl + '/' + endpoint;
        };
        
        console.log('Environment configuration loaded successfully');
    } catch (error) {
        console.error('Failed to initialize environment configuration:', error);
        // Fallback configuration
        window.ENV_CONFIG = { 
            API_BASE_URL: window.location.origin,
            DEBUG: false
        };
    }
})(window); 