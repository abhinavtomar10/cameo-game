FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y nodejs npm

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
EXPOSE 8000

# Command to run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"] 