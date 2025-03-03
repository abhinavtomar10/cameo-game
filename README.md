# Cameo Card Game

A multiplayer card game built with Django, React, and WebSocket.

## Features

- Real-time multiplayer gameplay
- WebSocket communication
- Modern React frontend
- Django backend with REST API
- Redis for WebSocket channel layer

## Local Development Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd cameo_project
```

2. Set up Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
cd cameo_backend
pip install -r requirements.txt
```

4. Install Node.js dependencies:
```bash
cd ../cameo_frontend
npm install
```

5. Start Redis server:
```bash
redis-server
```

6. Build React frontend:
```bash
npm run build
```

7. Run Django development server:
```bash
cd ../cameo_backend
python manage.py collectstatic --noinput
python run_daphne.py
```

8. Access the application at http://localhost:8000

## Deployment

This project is configured for deployment using GitHub Pages for the frontend and a separate backend hosting service.

### Frontend Deployment (GitHub Pages)

1. Push your code to the main branch of your GitHub repository
2. Go to your repository settings
3. Navigate to "Pages" in the left sidebar
4. Under "Source", select "GitHub Actions"
5. The frontend will be automatically deployed to `https://<your-username>.github.io/<repository-name>`

### Backend Deployment

The backend deployment package will be created as an artifact in your GitHub Actions workflow. You can download this package and deploy it to any hosting service that supports Python applications (e.g., Heroku, DigitalOcean, AWS, etc.).

1. Go to your GitHub repository
2. Click on "Actions"
3. Select the latest workflow run
4. Scroll down to "Artifacts"
5. Download the "backend-package" zip file
6. Deploy the package to your chosen hosting service

### Environment Variables

Make sure to set up the following environment variables on your backend hosting service:
- `DEBUG=False`
- `ALLOWED_HOSTS=<your-domain>`
- `CORS_ALLOWED_ORIGINS=https://<your-username>.github.io`
- `REDIS_URL=<your-redis-url>`

### Frontend Configuration

After deployment, update the WebSocket connection URL in your frontend code to point to your backend server:

```javascript
// In cameo_frontend/src/App.js or similar
const ws = new WebSocket('wss://<your-backend-domain>/ws/game/');
```

## Game Rules

[Add your game rules here]

## Contributing

[Add contribution guidelines here]

## License

[Add your license information here] 