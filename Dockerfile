FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APP_HOME=/app

# Install system dependencies
RUN apt-get update && apt-get install -y nodejs npm git curl

# Create directories and set permissions
WORKDIR $APP_HOME
RUN mkdir -p $APP_HOME/staticfiles
RUN mkdir -p $APP_HOME/cameo_backend/static

# Copy project files
COPY . $APP_HOME/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

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

# Create emergency fix scripts
RUN mkdir -p cameo_backend/static/
RUN cp -f cameo_backend/static/emergency-fix.js cameo_backend/static/emergency-fix.js
RUN cp -f cameo_backend/static/extreme-patch.js cameo_backend/static/extreme-patch.js
RUN cp -f cameo_backend/static/direct-patch.js cameo_backend/static/direct-patch.js

# Build React frontend
WORKDIR $APP_HOME/cameo_frontend
RUN npm install
RUN npm run build

# Copy build files to Django static directory
WORKDIR $APP_HOME
RUN cp -r cameo_frontend/build/static/* cameo_backend/static/static/
RUN mkdir -p cameo_backend/static/js
RUN echo 'console.log("API patching script loaded");' > cameo_backend/static/api-patch.js
RUN echo 'console.log("Preload patching script loaded");' > cameo_backend/static/preload-patch.js

# Create a custom index.html for React to ensure it loads correctly
RUN mkdir -p cameo_backend/templates
RUN touch cameo_backend/templates/react.html

# Collect static files
RUN python manage.py collectstatic --noinput

# Create a startup script
RUN echo '#!/bin/bash\npython manage.py migrate\ngunicorn cameo_project.wsgi:application --bind 0.0.0.0:$PORT --log-file -' > start.sh
RUN chmod +x start.sh

# Run the application
CMD ["./start.sh"]