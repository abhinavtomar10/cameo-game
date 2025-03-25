FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_HOME=/app
ENV DJANGO_SETTINGS_MODULE=cameo_backend.settings
ENV NODE_VERSION=18.x
ENV NPM_VERSION=9.x

# Install system dependencies with better error handling
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

# Install Python dependencies
# Use the requirements.txt in the cameo_backend directory
RUN pip install --no-cache-dir -r $APP_HOME/cameo_backend/requirements.txt

# Create public directory and manifest.json
RUN mkdir -p public
RUN echo '{ \
  "short_name": "Cameo", \
  "name": "Cameo Card Game", \
  "icons": [], \
  "start_url": ".", \
  "display": "standalone", \
  "theme_color": "#000000", \
  "background_color": "#ffffff" \
}' > public/manifest.json

# Create environment config for the frontend
RUN echo 'window.ENV_CONFIG = { API_BASE_URL: window.location.origin, DEBUG: false };' > public/env-config.js

# Ensure emergency fix scripts directory exists
RUN mkdir -p cameo_backend/static/

# Check if React frontend directory exists and has package.json
RUN if [ -d "$APP_HOME/cameo_frontend" ] && [ -f "$APP_HOME/cameo_frontend/package.json" ]; then \
      echo "Found React frontend, building..."; \
      cd $APP_HOME/cameo_frontend && \
      npm install --loglevel verbose && \
      npm run build; \
    else \
      echo "No React frontend found or missing package.json. Creating minimal static structure."; \
      mkdir -p $APP_HOME/cameo_backend/static/static/css && \
      mkdir -p $APP_HOME/cameo_backend/static/static/js && \
      # Create minimal CSS file
      echo "body { font-family: sans-serif; }" > $APP_HOME/cameo_backend/static/static/css/main.css && \
      # Create minimal JS file
      echo "console.log('Minimal JS bundle loaded');" > $APP_HOME/cameo_backend/static/static/js/main.js; \
    fi

# Ensure static directories exist
WORKDIR $APP_HOME
RUN mkdir -p cameo_backend/static/static/css cameo_backend/static/static/js

# Create minimal static files if they don't exist yet (fallback)
RUN if [ ! -f "cameo_backend/static/static/css/main.css" ]; then \
      echo "body { font-family: sans-serif; }" > cameo_backend/static/static/css/main.css; \
    fi
    
RUN if [ ! -f "cameo_backend/static/static/js/main.js" ]; then \
      echo "console.log('Minimal JS bundle loaded');" > cameo_backend/static/static/js/main.js; \
    fi

# Create API patch scripts
RUN echo 'console.log("API patching script loaded");' > cameo_backend/static/api-patch.js
RUN echo 'console.log("Preload patching script loaded");' > cameo_backend/static/preload-patch.js

# Debug - list files to ensure they exist
RUN ls -la cameo_backend/static/

# Ensure templates directory exists
RUN mkdir -p cameo_backend/templates

# Create a simplified version of react.html
RUN echo '<!DOCTYPE html>' > cameo_backend/templates/react.html
RUN echo '<html lang="en">' >> cameo_backend/templates/react.html
RUN echo '<head>' >> cameo_backend/templates/react.html
RUN echo '    <meta charset="utf-8" />' >> cameo_backend/templates/react.html
RUN echo '    <meta name="viewport" content="width=device-width, initial-scale=1" />' >> cameo_backend/templates/react.html
RUN echo '    <meta name="theme-color" content="#000000" />' >> cameo_backend/templates/react.html
RUN echo '    <meta name="description" content="Cameo Card Game" />' >> cameo_backend/templates/react.html
RUN echo '    <title>Cameo Card Game</title>' >> cameo_backend/templates/react.html
RUN echo '    <script>' >> cameo_backend/templates/react.html
RUN echo '    (function() {' >> cameo_backend/templates/react.html
RUN echo '      console.log("EMERGENCY FIX: Injecting protocol fixes");' >> cameo_backend/templates/react.html
RUN echo '      window.__fixUrl = function(url) {' >> cameo_backend/templates/react.html
RUN echo '        if (typeof url !== "string") return url;' >> cameo_backend/templates/react.html
RUN echo '        if (url.includes("127.0.0.1:8000") || url.includes("localhost:8000")) {' >> cameo_backend/templates/react.html
RUN echo '          if (url.startsWith("http")) {' >> cameo_backend/templates/react.html
RUN echo '            const path = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, "");' >> cameo_backend/templates/react.html
RUN echo '            return window.location.origin + path;' >> cameo_backend/templates/react.html
RUN echo '          }' >> cameo_backend/templates/react.html
RUN echo '        }' >> cameo_backend/templates/react.html
RUN echo '        return url;' >> cameo_backend/templates/react.html
RUN echo '      };' >> cameo_backend/templates/react.html
RUN echo '      window.startGameDirectly = function() {' >> cameo_backend/templates/react.html
RUN echo '        return fetch(window.location.origin + "/api/start/", {' >> cameo_backend/templates/react.html
RUN echo '          method: "POST", headers: {"Content-Type": "application/json"}, body: "{}"' >> cameo_backend/templates/react.html
RUN echo '        }).then(r => r.json());' >> cameo_backend/templates/react.html
RUN echo '      };' >> cameo_backend/templates/react.html
RUN echo '    })();' >> cameo_backend/templates/react.html
RUN echo '    </script>' >> cameo_backend/templates/react.html
RUN echo '    <link rel="stylesheet" href="/static/static/css/main.css" />' >> cameo_backend/templates/react.html
RUN echo '</head>' >> cameo_backend/templates/react.html
RUN echo '<body>' >> cameo_backend/templates/react.html
RUN echo '    <div id="root"></div>' >> cameo_backend/templates/react.html
RUN echo '    <script src="/static/static/js/main.js"></script>' >> cameo_backend/templates/react.html
RUN echo '    <script>' >> cameo_backend/templates/react.html
RUN echo '    setTimeout(function() {' >> cameo_backend/templates/react.html
RUN echo '        document.addEventListener("click", function(e) {' >> cameo_backend/templates/react.html
RUN echo '            if (e.target && e.target.tagName === "BUTTON" && e.target.innerText && e.target.innerText.includes("Start Game")) {' >> cameo_backend/templates/react.html
RUN echo '                e.preventDefault(); e.stopPropagation();' >> cameo_backend/templates/react.html
RUN echo '                window.startGameDirectly();' >> cameo_backend/templates/react.html
RUN echo '                return false;' >> cameo_backend/templates/react.html
RUN echo '            }' >> cameo_backend/templates/react.html
RUN echo '        }, true);' >> cameo_backend/templates/react.html
RUN echo '    }, 2000);' >> cameo_backend/templates/react.html
RUN echo '    </script>' >> cameo_backend/templates/react.html
RUN echo '</body>' >> cameo_backend/templates/react.html
RUN echo '</html>' >> cameo_backend/templates/react.html

# Collect static files
RUN cd $APP_HOME && python manage.py collectstatic --noinput

# Create a startup script
RUN echo '#!/bin/bash' > start.sh
RUN echo 'cd $APP_HOME' >> start.sh
RUN echo 'python manage.py migrate' >> start.sh
RUN echo 'echo "Starting gunicorn with cameo_backend.wsgi:application"' >> start.sh
RUN echo 'gunicorn cameo_backend.wsgi:application --bind 0.0.0.0:$PORT --log-file -' >> start.sh
RUN chmod +x start.sh

# Run the application
CMD ["./start.sh"]