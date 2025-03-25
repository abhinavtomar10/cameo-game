FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_HOME=/app
ENV DJANGO_SETTINGS_MODULE=cameo_backend.settings
ENV NODE_VERSION=18.x

# Install system dependencies
RUN apt-get update && \
    apt-get install -y curl gnupg git && \
    # Install Node.js from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - && \
    apt-get install -y nodejs && \
    # Verify installations 
    python --version && \
    node --version && \
    npm --version && \
    # Clean up
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create directories and set permissions
WORKDIR $APP_HOME
RUN mkdir -p $APP_HOME/staticfiles
RUN mkdir -p $APP_HOME/cameo_backend/static

# Copy project files
COPY . $APP_HOME/

# Debug - List directory contents to verify file structure
RUN ls -la $APP_HOME/
RUN ls -la $APP_HOME/cameo_backend/ || echo "No cameo_backend directory found"

# Install Python dependencies
RUN pip install --no-cache-dir -r $APP_HOME/cameo_backend/requirements.txt

# Create manifest.json
RUN mkdir -p $APP_HOME/cameo_backend/static
RUN echo '{ \
  "short_name": "Cameo", \
  "name": "Cameo Card Game", \
  "icons": [], \
  "start_url": ".", \
  "display": "standalone", \
  "theme_color": "#000000", \
  "background_color": "#ffffff" \
}' > $APP_HOME/cameo_backend/static/manifest.json

# Create runtime configuration script
RUN mkdir -p $APP_HOME/cameo_backend/cameo_frontend/public
RUN echo 'window.RUNTIME_CONFIG = { \
  API_BASE_URL: window.location.origin, \
  getWebSocketURL: function(gameCode) { \
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"; \
    return protocol + "//" + window.location.host + "/ws/game/" + gameCode + "/"; \
  } \
};' > $APP_HOME/cameo_backend/cameo_frontend/public/runtime-config.js

# Patch the index.html to include the runtime config
RUN echo '<!DOCTYPE html>\n\
<html lang="en">\n\
  <head>\n\
    <meta charset="utf-8" />\n\
    <meta name="viewport" content="width=device-width, initial-scale=1" />\n\
    <meta name="theme-color" content="#000000" />\n\
    <meta name="description" content="Cameo Card Game" />\n\
    <title>Cameo Card Game</title>\n\
    <script src="%PUBLIC_URL%/runtime-config.js"></script>\n\
  </head>\n\
  <body>\n\
    <div id="root"></div>\n\
  </body>\n\
</html>' > $APP_HOME/cameo_backend/cameo_frontend/public/index.html

# Create build-time config with fallback for the config.js
RUN echo 'const config = window.RUNTIME_CONFIG || {\n\
  API_BASE_URL: window.location.origin,\n\
  getWebSocketURL: function(gameCode) {\n\
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";\n\
    return protocol + "//" + window.location.host + "/ws/game/" + gameCode + "/";\n\
  }\n\
};\n\
export default config;' > $APP_HOME/cameo_backend/cameo_frontend/src/config.js

# Build React frontend
WORKDIR $APP_HOME/cameo_backend/cameo_frontend
RUN npm install && \
    npm run build && \
    mkdir -p $APP_HOME/cameo_backend/static/static && \
    cp -r build/static/* $APP_HOME/cameo_backend/static/static/ && \
    cp build/runtime-config.js $APP_HOME/cameo_backend/static/ || echo "No React static files to copy"

# Create templates directory and go back to app root
WORKDIR $APP_HOME/cameo_backend
RUN mkdir -p templates

# Create react.html template with runtime config and our final fix
RUN echo '<!DOCTYPE html>' > templates/react.html && \
    echo '<html lang="en">' >> templates/react.html && \
    echo '<head>' >> templates/react.html && \
    echo '    <meta charset="utf-8" />' >> templates/react.html && \
    echo '    <meta name="viewport" content="width=device-width, initial-scale=1" />' >> templates/react.html && \
    echo '    <meta name="theme-color" content="#000000" />' >> templates/react.html && \
    echo '    <meta name="description" content="Cameo Card Game" />' >> templates/react.html && \
    echo '    <title>Cameo Card Game</title>' >> templates/react.html && \
    echo '    <script>' >> templates/react.html && \
    echo '        // URL Fixer for hardcoded localhost URLs' >> templates/react.html && \
    echo '        (function() {' >> templates/react.html && \
    echo '            console.log("🚀 Early URL Interceptor activated");' >> templates/react.html && \
    echo '            window.__originalFetch = window.fetch;' >> templates/react.html && \
    echo '            window.__originalXhrOpen = XMLHttpRequest.prototype.open;' >> templates/react.html && \
    echo '            window.__originalWebSocket = window.WebSocket;' >> templates/react.html && \
    echo '' >> templates/react.html && \
    echo '            window.__fixUrl = function(url) {' >> templates/react.html && \
    echo '                if (typeof url !== "string") return url;' >> templates/react.html && \
    echo '                if (url.includes("127.0.0.1:8000") || url.includes("localhost:8000")) {' >> templates/react.html && \
    echo '                    console.log("🔄 Early rewrite:", url);' >> templates/react.html && \
    echo '                    if (url.startsWith("http")) {' >> templates/react.html && \
    echo '                        const path = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, "");' >> templates/react.html && \
    echo '                        return window.location.origin + path;' >> templates/react.html && \
    echo '                    } else if (url.startsWith("ws")) {' >> templates/react.html && \
    echo '                        const path = url.replace(/^wss?:\/\/(localhost|127\.0\.0\.1):8000/, "");' >> templates/react.html && \
    echo '                        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";' >> templates/react.html && \
    echo '                        return protocol + "//" + window.location.host + path;' >> templates/react.html && \
    echo '                    }' >> templates/react.html && \
    echo '                }' >> templates/react.html && \
    echo '                return url;' >> templates/react.html && \
    echo '            };' >> templates/react.html && \
    echo '' >> templates/react.html && \
    echo '            // Override fetch before React loads' >> templates/react.html && \
    echo '            window.fetch = function(resource, init) {' >> templates/react.html && \
    echo '                if (typeof resource === "string") {' >> templates/react.html && \
    echo '                    resource = window.__fixUrl(resource);' >> templates/react.html && \
    echo '                }' >> templates/react.html && \
    echo '                return window.__originalFetch.apply(this, arguments);' >> templates/react.html && \
    echo '            };' >> templates/react.html && \
    echo '' >> templates/react.html && \
    echo '            // Override XMLHttpRequest' >> templates/react.html && \
    echo '            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {' >> templates/react.html && \
    echo '                url = window.__fixUrl(url);' >> templates/react.html && \
    echo '                return window.__originalXhrOpen.call(this, method, url, async, user, password);' >> templates/react.html && \
    echo '            };' >> templates/react.html && \
    echo '' >> templates/react.html && \
    echo '            // Override WebSocket constructor' >> templates/react.html && \
    echo '            window.WebSocket = function(url, protocols) {' >> templates/react.html && \
    echo '                url = window.__fixUrl(url);' >> templates/react.html && \
    echo '                return new window.__originalWebSocket(url, protocols);' >> templates/react.html && \
    echo '            };' >> templates/react.html && \
    echo '            window.WebSocket.prototype = window.__originalWebSocket.prototype;' >> templates/react.html && \
    echo '        })();' >> templates/react.html && \
    echo '    </script>' >> templates/react.html && \
    echo '    <script src="/static/runtime-config.js"></script>' >> templates/react.html && \
    echo '    <link rel="stylesheet" href="/static/static/css/main.css" />' >> templates/react.html && \
    echo '</head>' >> templates/react.html && \
    echo '<body>' >> templates/react.html && \
    echo '    <div id="root"></div>' >> templates/react.html && \
    echo '    <script src="/static/static/js/main.js"></script>' >> templates/react.html && \
    echo '    <script src="/static/final-fix.js"></script>' >> templates/react.html && \
    echo '    <script>' >> templates/react.html && \
    echo '    // Safety net for Start Game button' >> templates/react.html && \
    echo '    setTimeout(function() {' >> templates/react.html && \
    echo '        console.log("⏱️ Safety net activated");' >> templates/react.html && \
    echo '        document.addEventListener("click", function(event) {' >> templates/react.html && \
    echo '            var target = event.target;' >> templates/react.html && \
    echo '            if (target.tagName === "BUTTON" && target.textContent.includes("Start Game")) {' >> templates/react.html && \
    echo '                console.log("🎮 Start Game button clicked - using safety handler");' >> templates/react.html && \
    echo '                event.preventDefault();' >> templates/react.html && \
    echo '                event.stopPropagation();' >> templates/react.html && \
    echo '                ' >> templates/react.html && \
    echo '                fetch(window.location.origin + "/api/start/", {' >> templates/react.html && \
    echo '                    method: "POST",' >> templates/react.html && \
    echo '                    headers: {"Content-Type": "application/json"},' >> templates/react.html && \
    echo '                    body: JSON.stringify({})' >> templates/react.html && \
    echo '                })' >> templates/react.html && \
    echo '                .then(function(response) { return response.json(); })' >> templates/react.html && \
    echo '                .then(function(data) {' >> templates/react.html && \
    echo '                    console.log("✅ Game started via safety net:", data);' >> templates/react.html && \
    echo '                    // Update UI' >> templates/react.html && \
    echo '                    window.location.reload();' >> templates/react.html && \
    echo '                })' >> templates/react.html && \
    echo '                .catch(function(error) {' >> templates/react.html && \
    echo '                    console.error("❌ Start Game error:", error);' >> templates/react.html && \
    echo '                });' >> templates/react.html && \
    echo '                ' >> templates/react.html && \
    echo '                return false;' >> templates/react.html && \
    echo '            }' >> templates/react.html && \
    echo '        }, true); // Use capture phase to run before React handlers' >> templates/react.html && \
    echo '    }, 2000);' >> templates/react.html && \
    echo '    </script>' >> templates/react.html && \
    echo '</body>' >> templates/react.html && \
    echo '</html>' >> templates/react.html

# Collect static files 
RUN python manage.py collectstatic --noinput || echo "Collectstatic failed, but continuing..."

# Create a startup script
RUN echo '#!/bin/bash' > start.sh && \
    echo 'cd $APP_HOME/cameo_backend' >> start.sh && \
    echo 'echo "Starting application in $(pwd)"' >> start.sh && \
    echo 'python manage.py migrate --noinput' >> start.sh && \
    echo 'exec gunicorn cameo_backend.wsgi:application --bind 0.0.0.0:$PORT --workers=2 --log-level=info' >> start.sh && \
    chmod +x start.sh

# Run the application
CMD ["./start.sh"]