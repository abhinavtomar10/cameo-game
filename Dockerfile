FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:${PATH}"
ENV PORT=8000

# Install system dependencies and verify Python/pip
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    gnupg \
    nodejs \
    npm \
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

# Build React frontend
WORKDIR /app/cameo_frontend
RUN npm install && npm run build

# Go back to the main directory
WORKDIR /app

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE ${PORT}

# Command to run the application
CMD gunicorn cameo_backend.wsgi:application --bind 0.0.0.0:${PORT} 