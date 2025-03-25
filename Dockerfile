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

# Build React frontend
WORKDIR $APP_HOME/cameo_backend/cameo_frontend
RUN npm install && \
    npm run build && \
    mkdir -p $APP_HOME/cameo_backend/static/static && \
    cp -r build/static/* $APP_HOME/cameo_backend/static/static/ || echo "No React static files to copy"

# Create templates directory and go back to app root
WORKDIR $APP_HOME/cameo_backend
RUN mkdir -p templates

# Create a simple react.html template
RUN echo '<!DOCTYPE html>' > templates/react.html && \
    echo '<html lang="en">' >> templates/react.html && \
    echo '<head>' >> templates/react.html && \
    echo '    <meta charset="utf-8" />' >> templates/react.html && \
    echo '    <meta name="viewport" content="width=device-width, initial-scale=1" />' >> templates/react.html && \
    echo '    <meta name="theme-color" content="#000000" />' >> templates/react.html && \
    echo '    <meta name="description" content="Cameo Card Game" />' >> templates/react.html && \
    echo '    <title>Cameo Card Game</title>' >> templates/react.html && \
    echo '    <link rel="stylesheet" href="/static/static/css/main.css" />' >> templates/react.html && \
    echo '</head>' >> templates/react.html && \
    echo '<body>' >> templates/react.html && \
    echo '    <div id="root"></div>' >> templates/react.html && \
    echo '    <script src="/static/static/js/main.js"></script>' >> templates/react.html && \
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