FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:${PATH}"
ENV PORT=8000
ENV DEBUG=False
ENV ALLOWED_HOSTS=".up.railway.app,localhost,127.0.0.1"

# Install system dependencies and verify Python/pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gnupg \
    nodejs \
    npm \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && python --version \
    && python -m pip --version

# Set work directory
WORKDIR /app

# Copy the backend code
COPY cameo_backend /app

# Install Python dependencies
RUN python -m pip install --no-cache-dir --upgrade pip && \
    python -m pip install --no-cache-dir -r requirements.txt

# Build React frontend with verbose output
WORKDIR /app/cameo_frontend
RUN echo "Building frontend with Node $(node --version) and NPM $(npm --version)" && \
    npm install && \
    # Create necessary files for the build
    mkdir -p public && \
    # Create manifest.json
    touch public/manifest.json && \
    echo '{ "short_name": "Cameo Game", "name": "Cameo Card Game", "icons": [], "start_url": ".", "display": "standalone", "theme_color": "#000000", "background_color": "#ffffff" }' > public/manifest.json && \
    # Create environment config
    echo 'window.ENV_CONFIG = { API_BASE_URL: window.location.origin, DEBUG: false };' > public/env-config.js && \
    # Build with production flag
    NODE_ENV=production npm run build && \
    ls -la build && \
    echo "Frontend build content:" && \
    find build -type f | sort && \
    echo "Frontend build completed"

# Check and copy static assets
RUN mkdir -p /app/static && \
    if [ -d /app/cameo_frontend/build/static ]; then \
        cp -r /app/cameo_frontend/build/static/* /app/static/ && \
        echo "Copied React static files to Django static directory"; \
    else \
        echo "No React static files found"; \
    fi

# Go back to the main directory
WORKDIR /app

# Create custom scripts
RUN mkdir -p /app/static
COPY cameo_backend/static/env-config.js /app/static/
COPY cameo_backend/static/api-patch.js /app/static/

# Add custom index.html file to ensure React build is loaded properly
RUN mkdir -p /app/templates && \
    echo '<!DOCTYPE html>\n\
<html lang="en">\n\
<head>\n\
    <meta charset="utf-8" />\n\
    <meta name="viewport" content="width=device-width, initial-scale=1" />\n\
    <meta name="theme-color" content="#000000" />\n\
    <meta name="description" content="Cameo Card Game" />\n\
    <title>Cameo Card Game</title>\n\
    <!-- Load environment config first -->\n\
    <script src="/static/env-config.js"></script>\n\
    <!-- Add API call patching script -->\n\
    <script src="/static/api-patch.js"></script>\n\
    <!-- Add stylesheets -->\n\
    <link rel="stylesheet" href="/static/css/main.css" />\n\
</head>\n\
<body>\n\
    <div id="root"></div>\n\
    <script>\n\
    // Window-level debug helper\n\
    window.debugApiCalls = function() {\n\
        console.log("ENV_CONFIG:", window.ENV_CONFIG);\n\
        console.log("Current origin:", window.location.origin);\n\
        console.log("API URL example:", window.getApiUrl ? window.getApiUrl("start/") : "getApiUrl not available");\n\
    };\n\
    // Call debug function once page loads\n\
    window.addEventListener("load", function() {\n\
        console.log("Page loaded, debugging API configuration...");\n\
        if (window.debugApiCalls) window.debugApiCalls();\n\
    });\n\
    </script>\n\
    <script src="/static/js/main.js"></script>\n\
</body>\n\
</html>' > /app/templates/react.html

# Collect static files
RUN python manage.py collectstatic --noinput --verbosity 2

# Create a script to run the application
RUN echo '#!/bin/bash\n\
echo "Starting application..."\n\
echo "Environment variables:"\n\
echo "PORT=$PORT"\n\
echo "ALLOWED_HOSTS=$ALLOWED_HOSTS"\n\
echo "DEBUG=$DEBUG"\n\
echo "Current directory: $(pwd)"\n\
echo "Listing directories:"\n\
ls -la\n\
echo "Listing template directory:"\n\
ls -la cameo_frontend/build || echo "No frontend build directory found"\n\
echo "Listing static files:"\n\
ls -la staticfiles\n\
echo "Starting Gunicorn on 0.0.0.0:$PORT"\n\
gunicorn cameo_backend.wsgi:application --bind 0.0.0.0:$PORT --log-level debug\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE ${PORT}

# Command to run the application
CMD ["/app/start.sh"] 