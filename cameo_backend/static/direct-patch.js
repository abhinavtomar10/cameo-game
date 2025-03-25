// Direct network connection patcher - most aggressive solution
(function() {
    console.log("DIRECT-PATCH: Initializing direct connection patcher");
    
    // ========== STAGE 1: Patch browser-level networking ==========
    
    // Patch XMLHttpRequest at the lowest level
    const origXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        if (url && typeof url === 'string') {
            if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
                console.log("DIRECT-PATCH: XHR - Intercepted:", url);
                url = url.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                console.log("DIRECT-PATCH: XHR - Rewritten to:", url);
            }
        }
        return origXHROpen.call(this, method, url, async, user, password);
    };
    
    // Patch fetch API
    const origFetch = window.fetch;
    window.fetch = function(resource, init) {
        if (resource && typeof resource === 'string') {
            if (resource.includes('127.0.0.1:8000') || resource.includes('localhost:8000')) {
                console.log("DIRECT-PATCH: Fetch - Intercepted:", resource);
                resource = resource.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                console.log("DIRECT-PATCH: Fetch - Rewritten to:", resource);
            }
        } else if (resource && resource instanceof Request) {
            const url = resource.url;
            if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
                console.log("DIRECT-PATCH: Fetch Request - Intercepted:", url);
                const newUrl = url.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                console.log("DIRECT-PATCH: Fetch Request - Rewritten to:", newUrl);
                resource = new Request(newUrl, resource);
            }
        }
        return origFetch.call(this, resource, init);
    };
    
    // ========== STAGE 2: Patch WebSockets ==========
    
    const origWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        if (url && typeof url === 'string') {
            if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
                console.log("DIRECT-PATCH: WebSocket - Intercepted:", url);
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                url = url.replace(/ws:\/\/(localhost|127\.0\.0\.1):8000/g, wsProtocol + '//' + window.location.host);
                console.log("DIRECT-PATCH: WebSocket - Rewritten to:", url);
            }
        }
        return new origWebSocket(url, protocols);
    };
    
    // ========== STAGE 3: Direct JavaScript source code patching ==========
    
    // Patch all scripts at load time
    const origCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = origCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            const origSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && typeof value === 'string') {
                    if (value.includes('127.0.0.1:8000') || value.includes('localhost:8000')) {
                        console.log("DIRECT-PATCH: Script - Intercepted src:", value);
                        value = value.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                        console.log("DIRECT-PATCH: Script - Rewritten to:", value);
                    }
                }
                return origSetAttribute.call(this, name, value);
            };
            
            // Override the script content setter to replace localhost references
            const scriptDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'text');
            if (scriptDescriptor && scriptDescriptor.set) {
                const origSetter = scriptDescriptor.set;
                Object.defineProperty(element, 'text', {
                    set: function(content) {
                        if (content && typeof content === 'string') {
                            // Match and replace any localhost URLs in the script content
                            if (content.includes('127.0.0.1:8000') || content.includes('localhost:8000')) {
                                console.log("DIRECT-PATCH: Script Content - Found localhost:8000 references");
                                content = content.replace(/(['"])https?:\/\/(localhost|127\.0\.0\.1):8000([^'"]*?)(['"])/g, 
                                    function(match, quote1, host, path, quote2) {
                                        console.log("DIRECT-PATCH: Script Content - Replacing:", match);
                                        return quote1 + window.location.origin + path + quote2;
                                    });
                                console.log("DIRECT-PATCH: Script Content - Patched with correct origin");
                            }
                        }
                        return origSetter.call(this, content);
                    },
                    get: scriptDescriptor.get,
                    configurable: true
                });
            }
        }
        
        return element;
    };
    
    // ========== STAGE 4: Axios-specific patches ==========
    
    // Function to create a robust axios patcher
    function patchAxios() {
        if (!window.axios) return false;
        
        // Save references to original methods
        if (!window._axiosOriginals) {
            window._axiosOriginals = {
                request: window.axios.request,
                get: window.axios.get,
                post: window.axios.post,
                put: window.axios.put,
                patch: window.axios.patch,
                delete: window.axios.delete
            };
        } else {
            // Already patched
            return true;
        }
        
        // Helper to patch URLs
        function patchAxiosUrl(url) {
            if (!url || typeof url !== 'string') return url;
            
            if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
                console.log("DIRECT-PATCH: Axios - Intercepted URL:", url);
                const newUrl = url.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                console.log("DIRECT-PATCH: Axios - Rewritten to:", newUrl);
                return newUrl;
            }
            return url;
        }
        
        // Patch individual methods
        window.axios.request = function(config) {
            if (config && config.url) {
                config.url = patchAxiosUrl(config.url);
            }
            return window._axiosOriginals.request.call(this, config);
        };
        
        window.axios.get = function(url, config) {
            url = patchAxiosUrl(url);
            return window._axiosOriginals.get.call(this, url, config);
        };
        
        window.axios.post = function(url, data, config) {
            url = patchAxiosUrl(url);
            return window._axiosOriginals.post.call(this, url, data, config);
        };
        
        window.axios.put = function(url, data, config) {
            url = patchAxiosUrl(url);
            return window._axiosOriginals.put.call(this, url, data, config);
        };
        
        window.axios.patch = function(url, data, config) {
            url = patchAxiosUrl(url);
            return window._axiosOriginals.patch.call(this, url, data, config);
        };
        
        window.axios.delete = function(url, config) {
            url = patchAxiosUrl(url);
            return window._axiosOriginals.delete.call(this, url, config);
        };
        
        // Also patch axios.create to ensure new instances are also patched
        const origCreate = window.axios.create;
        if (origCreate) {
            window.axios.create = function(config) {
                // Patch baseURL if present
                if (config && config.baseURL && typeof config.baseURL === 'string') {
                    if (config.baseURL.includes('127.0.0.1:8000') || config.baseURL.includes('localhost:8000')) {
                        console.log("DIRECT-PATCH: Axios Create - Intercepted baseURL:", config.baseURL);
                        config.baseURL = config.baseURL.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                        console.log("DIRECT-PATCH: Axios Create - Rewritten to:", config.baseURL);
                    }
                }
                
                // Create the instance
                const instance = origCreate.call(this, config);
                
                // Patch the instance methods
                const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'];
                methods.forEach(method => {
                    if (typeof instance[method] === 'function') {
                        const originalMethod = instance[method];
                        if (method === 'request') {
                            instance[method] = function(config) {
                                if (config && config.url) {
                                    config.url = patchAxiosUrl(config.url);
                                }
                                return originalMethod.call(this, config);
                            };
                        } else {
                            instance[method] = function(url, ...args) {
                                url = patchAxiosUrl(url);
                                return originalMethod.call(this, url, ...args);
                            };
                        }
                    }
                });
                
                return instance;
            };
        }
        
        console.log("DIRECT-PATCH: Axios patching complete");
        return true;
    }
    
    // Try to patch axios immediately
    if (window.axios) {
        patchAxios();
    }
    
    // Monitor for axios appearing later
    window.axiosPatchInterval = setInterval(function() {
        if (window.axios && !window._axiosOriginals) {
            console.log("DIRECT-PATCH: Found axios, applying patches");
            patchAxios();
        }
    }, 100);
    
    // Stop checking after a while
    setTimeout(function() {
        if (window.axiosPatchInterval) {
            clearInterval(window.axiosPatchInterval);
            console.log("DIRECT-PATCH: Stopped monitoring for axios");
        }
    }, 10000);
    
    // ========== STAGE 5: Source code injector ==========
    
    // This is the most extreme approach - directly modify loaded JavaScript on the fly
    // Create a MutationObserver to watch for script tags being added and modify them
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.tagName === 'SCRIPT') {
                        console.log("DIRECT-PATCH: MutationObserver detected new script");
                        
                        // Check for src attribute
                        if (node.src && (node.src.includes('127.0.0.1:8000') || node.src.includes('localhost:8000'))) {
                            console.log("DIRECT-PATCH: MutationObserver - Patching script src:", node.src);
                            node.src = node.src.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/g, window.location.origin);
                        }
                        
                        // If it's an inline script, check and modify its content
                        if (node.textContent && (node.textContent.includes('127.0.0.1:8000') || node.textContent.includes('localhost:8000'))) {
                            console.log("DIRECT-PATCH: MutationObserver - Patching inline script");
                            node.textContent = node.textContent.replace(
                                /(['"])https?:\/\/(localhost|127\.0\.0\.1):8000([^'"]*?)(['"])/g,
                                function(match, quote1, host, path, quote2) {
                                    return quote1 + window.location.origin + path + quote2;
                                }
                            );
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the document for script additions
    observer.observe(document, { childList: true, subtree: true });
    
    console.log("DIRECT-PATCH: Direct connection patcher initialized successfully");
})(); 