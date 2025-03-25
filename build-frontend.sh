#!/bin/bash

set -e

# Print a message with a timestamp
log() {
  echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1"
}

# Go to the project directory 
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)
log "Project root: $PROJECT_ROOT"

# Navigate to the React frontend directory
cd "$PROJECT_ROOT/cameo_backend/cameo_frontend"
log "Building React frontend in: $(pwd)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log "Installing npm dependencies..."
  npm install
else
  log "Node modules already installed, skipping npm install."
fi

# Build the React app
log "Building React app..."
npm run build

# Create static directories if they don't exist
mkdir -p "$PROJECT_ROOT/cameo_backend/static/static/css"
mkdir -p "$PROJECT_ROOT/cameo_backend/static/static/js"

# Copy the built files to the static directory
log "Copying built files to static directory..."
cp -r build/static/css/* "$PROJECT_ROOT/cameo_backend/static/static/css/"
cp -r build/static/js/* "$PROJECT_ROOT/cameo_backend/static/static/js/"

log "Collecting static files..."
cd "$PROJECT_ROOT/cameo_backend"
python manage.py collectstatic --noinput

log "React frontend build complete and static files collected!"
log "You can now run the Django server with: python manage.py runserver" 