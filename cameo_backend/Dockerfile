FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/local/bin:${PATH}"
ENV PORT=8000

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    nodejs \
    npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify Python and pip installation
RUN python --version && pip --version

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy project
COPY . .

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