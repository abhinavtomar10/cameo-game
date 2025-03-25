// EXTREME PATCH SOLUTION - Directly modify all scripts
// This script should be added *before* any other scripts on the page

(function() {
    console.log("🔥 EXTREME-PATCH: Initializing runtime JavaScript patcher");
    
    // Store original methods
    const originalCreateElement = document.createElement;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalWrite = document.write;
    const originalWriteln = document.writeln;
    
    // Function to modify script content
    function patchJavaScriptContent(content) {
        if (!content || typeof content !== 'string') return content;
        
        // Skip patching if it doesn't contain localhost references
        if (!content.includes('127.0.0.1:8000') && !content.includes('localhost:8000')) {
            return content;
        }
        
        console.log("🔥 EXTREME-PATCH: Found script with localhost references");
        
        // Replace direct string URL references
        let patchedContent = content.replace(
            /(['"`])https?:\/\/(?:localhost|127\.0\.0\.1):8000([^'"`]*?)(['"`])/g,
            function(match, quote1, path, quote2) {
                console.log("🔥 EXTREME-PATCH: Replacing URL reference:", match);
                return quote1 + window.location.origin + path + quote2;
            }
        );
        
        // Replace WebSocket URLs
        patchedContent = patchedContent.replace(
            /(['"`])ws:\/\/(?:localhost|127\.0\.0\.1):8000([^'"`]*?)(['"`])/g,
            function(match, quote1, path, quote2) {
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                console.log("🔥 EXTREME-PATCH: Replacing WebSocket URL reference:", match);
                return quote1 + wsProtocol + '//' + window.location.host + path + quote2;
            }
        );
        
        // Inject a function to replace the axios.post call (more aggressive approach)
        if (patchedContent.includes('axios.post') && 
            (patchedContent.includes('127.0.0.1:8000') || patchedContent.includes('localhost:8000'))) {
            
            // Add a special modification that targets the specific pattern in App.js
            const appJsPattern = /axios\.post\(['"](http:\/\/(?:localhost|127\.0\.0\.1):8000\/api\/start\/)['"]/g;
            patchedContent = patchedContent.replace(appJsPattern, function(match, url) {
                console.log("🔥 EXTREME-PATCH: Found direct axios.post to localhost, replacing with direct origin");
                return 'axios.post("' + window.location.origin + '/api/start/"';
            });
            
            // Also try to catch the WebSocket initialization
            const wsPattern = /new\s+WebSocket\([`'"](ws:\/\/(?:localhost|127\.0\.0\.1):8000[^`'"]*)[`'"]/g;
            patchedContent = patchedContent.replace(wsPattern, function(match, url) {
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const newUrl = url.replace(/ws:\/\/(?:localhost|127\.0\.0\.1):8000/, wsProtocol + '//' + window.location.host);
                console.log("🔥 EXTREME-PATCH: Replacing WebSocket constructor with:", newUrl);
                return 'new WebSocket("' + newUrl + '"';
            });
        }
        
        return patchedContent;
    }
    
    // Override document.createElement to intercept script elements
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        
        if (tagName.toLowerCase() === 'script') {
            // Override the script's text setter
            const scriptDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'text');
            if (scriptDescriptor && scriptDescriptor.set) {
                const originalSetter = scriptDescriptor.set;
                
                Object.defineProperty(element, 'text', {
                    set: function(content) {
                        return originalSetter.call(this, patchJavaScriptContent(content));
                    },
                    get: scriptDescriptor.get,
                    configurable: true
                });
            }
            
            // Also override textContent
            const textContentDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
            if (textContentDescriptor && textContentDescriptor.set) {
                const originalTextContentSetter = textContentDescriptor.set;
                
                Object.defineProperty(element, 'textContent', {
                    set: function(content) {
                        return originalTextContentSetter.call(this, patchJavaScriptContent(content));
                    },
                    get: textContentDescriptor.get,
                    configurable: true
                });
            }
            
            // Override the innerHTML setter
            const innerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
            if (innerHTMLDescriptor && innerHTMLDescriptor.set) {
                const originalInnerHTMLSetter = innerHTMLDescriptor.set;
                
                Object.defineProperty(element, 'innerHTML', {
                    set: function(content) {
                        return originalInnerHTMLSetter.call(this, patchJavaScriptContent(content));
                    },
                    get: innerHTMLDescriptor.get,
                    configurable: true
                });
            }
        }
        
        return element;
    };
    
    // Override appendChild to intercept script additions
    Node.prototype.appendChild = function(node) {
        if (node.tagName === 'SCRIPT') {
            // If it's a script with src to localhost, rewrite the src
            if (node.src && (node.src.includes('127.0.0.1:8000') || node.src.includes('localhost:8000'))) {
                console.log("🔥 EXTREME-PATCH: Rewriting script src:", node.src);
                node.src = node.src.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):8000/g, window.location.origin);
            }
            
            // If it has inline content, patch it
            if (node.text || node.textContent) {
                const content = node.text || node.textContent;
                if (content) {
                    const patchedContent = patchJavaScriptContent(content);
                    if (node.text) node.text = patchedContent;
                    if (node.textContent) node.textContent = patchedContent;
                }
            }
        }
        
        return originalAppendChild.call(this, node);
    };
    
    // Override insertBefore to intercept script additions
    Node.prototype.insertBefore = function(node, referenceNode) {
        if (node.tagName === 'SCRIPT') {
            // If it's a script with src to localhost, rewrite the src
            if (node.src && (node.src.includes('127.0.0.1:8000') || node.src.includes('localhost:8000'))) {
                console.log("🔥 EXTREME-PATCH: Rewriting script src in insertBefore:", node.src);
                node.src = node.src.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):8000/g, window.location.origin);
            }
            
            // If it has inline content, patch it
            if (node.text || node.textContent) {
                const content = node.text || node.textContent;
                if (content) {
                    const patchedContent = patchJavaScriptContent(content);
                    if (node.text) node.text = patchedContent;
                    if (node.textContent) node.textContent = patchedContent;
                }
            }
        }
        
        return originalInsertBefore.call(this, node, referenceNode);
    };
    
    // Override document.write to intercept inline scripts
    document.write = function(markup) {
        if (markup && typeof markup === 'string' && 
            (markup.includes('127.0.0.1:8000') || markup.includes('localhost:8000'))) {
            
            console.log("🔥 EXTREME-PATCH: Intercepted document.write with localhost references");
            
            // Replace URLs in the markup
            markup = markup.replace(
                /(['"])https?:\/\/(?:localhost|127\.0\.0\.1):8000([^'"]*?)(['"])/g,
                function(match, quote1, path, quote2) {
                    return quote1 + window.location.origin + path + quote2;
                }
            );
        }
        
        return originalWrite.call(document, markup);
    };
    
    // Override document.writeln to intercept inline scripts
    document.writeln = function(markup) {
        if (markup && typeof markup === 'string' && 
            (markup.includes('127.0.0.1:8000') || markup.includes('localhost:8000'))) {
            
            console.log("🔥 EXTREME-PATCH: Intercepted document.writeln with localhost references");
            
            // Replace URLs in the markup
            markup = markup.replace(
                /(['"])https?:\/\/(?:localhost|127\.0\.0\.1):8000([^'"]*?)(['"])/g,
                function(match, quote1, path, quote2) {
                    return quote1 + window.location.origin + path + quote2;
                }
            );
        }
        
        return originalWriteln.call(document, markup);
    };
    
    // Special handling for dynamically loaded scripts
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'SCRIPT') {
                            // Check for src attribute
                            if (node.src && (node.src.includes('127.0.0.1:8000') || node.src.includes('localhost:8000'))) {
                                console.log("🔥 EXTREME-PATCH: MutationObserver - Patching script src:", node.src);
                                node.src = node.src.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):8000/g, window.location.origin);
                            }
                            
                            // Check for inline script content
                            if (node.textContent && (node.textContent.includes('127.0.0.1:8000') || node.textContent.includes('localhost:8000'))) {
                                console.log("🔥 EXTREME-PATCH: MutationObserver - Patching inline script");
                                node.textContent = patchJavaScriptContent(node.textContent);
                            }
                        }
                    }
                });
            }
        });
    });
    
    // Start observing the document
    observer.observe(document, { childList: true, subtree: true });
    
    // SPECIAL HANDLING FOR AXIOS
    // This script must be loaded before axios, and it creates a proxy that intercepts axios method calls
    
    // Define a global object to track axios
    window.__axiosPatcher = {
        patched: false,
        interceptorInstalled: false,
        originalAxios: null,
        
        // Function to patch axios
        patchAxios: function() {
            if (this.patched || !window.axios) return;
            
            console.log("🔥 EXTREME-PATCH: Patching axios methods");
            
            // Store original methods
            this.originalAxios = {
                get: window.axios.get,
                post: window.axios.post,
                put: window.axios.put,
                delete: window.axios.delete,
                patch: window.axios.patch,
                request: window.axios.request,
                create: window.axios.create
            };
            
            // Helper function to patch URLs
            const patchUrl = function(url) {
                if (!url || typeof url !== 'string') return url;
                
                if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
                    console.log("🔥 EXTREME-PATCH: Axios - Intercepted URL:", url);
                    const newUrl = url.replace(/https?:\/\/(?:localhost|127\.0\.0\.1):8000/g, window.location.origin);
                    console.log("🔥 EXTREME-PATCH: Axios - Rewrote to:", newUrl);
                    return newUrl;
                }
                return url;
            };
            
            // Patch individual methods
            window.axios.get = function(url, config) {
                return window.__axiosPatcher.originalAxios.get.call(this, patchUrl(url), config);
            };
            
            window.axios.post = function(url, data, config) {
                return window.__axiosPatcher.originalAxios.post.call(this, patchUrl(url), data, config);
            };
            
            window.axios.put = function(url, data, config) {
                return window.__axiosPatcher.originalAxios.put.call(this, patchUrl(url), data, config);
            };
            
            window.axios.delete = function(url, config) {
                return window.__axiosPatcher.originalAxios.delete.call(this, patchUrl(url), config);
            };
            
            window.axios.patch = function(url, data, config) {
                return window.__axiosPatcher.originalAxios.patch.call(this, patchUrl(url), data, config);
            };
            
            window.axios.request = function(config) {
                if (config && config.url) {
                    config.url = patchUrl(config.url);
                }
                return window.__axiosPatcher.originalAxios.request.call(this, config);
            };
            
            // Also patch axios.create
            window.axios.create = function(config) {
                if (config && config.baseURL) {
                    config.baseURL = patchUrl(config.baseURL);
                }
                return window.__axiosPatcher.originalAxios.create.call(this, config);
            };
            
            this.patched = true;
            console.log("🔥 EXTREME-PATCH: Axios patching complete");
        },
        
        // Install a getter/setter to intercept when axios is added to window
        installInterceptor: function() {
            if (this.interceptorInstalled) return;
            
            // If axios already exists, patch it right away
            if (window.axios) {
                this.patchAxios();
            }
            
            // Otherwise, set up an interceptor for when it's added
            let _axios = window.axios;
            Object.defineProperty(window, 'axios', {
                configurable: true,
                enumerable: true,
                get: function() {
                    return _axios;
                },
                set: function(newAxios) {
                    console.log("🔥 EXTREME-PATCH: Detected axios being set on window");
                    _axios = newAxios;
                    window.__axiosPatcher.patchAxios();
                }
            });
            
            this.interceptorInstalled = true;
            console.log("🔥 EXTREME-PATCH: Installed axios interceptor");
        }
    };
    
    // Install the axios interceptor
    window.__axiosPatcher.installInterceptor();
    
    // Also check periodically for axios
    const checkInterval = setInterval(function() {
        if (window.axios && !window.__axiosPatcher.patched) {
            window.__axiosPatcher.patchAxios();
        }
        
        // If patched, stop checking
        if (window.__axiosPatcher.patched) {
            clearInterval(checkInterval);
        }
    }, 50);
    
    // Stop checking after 10 seconds
    setTimeout(function() {
        clearInterval(checkInterval);
    }, 10000);
    
    console.log("🔥 EXTREME-PATCH: Runtime JavaScript patcher initialized successfully");
})(); 