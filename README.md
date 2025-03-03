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

This project is configured for deployment on Railway.app using GitHub Actions.

1. Create a Railway account at https://railway.app
2. Create a new project on Railway
3. Get your Railway token from the Railway dashboard
4. Add the Railway token to your GitHub repository secrets as `RAILWAY_TOKEN`
5. Push your code to the main branch to trigger deployment

## Game Rules

[Add your game rules here]

## Contributing

[Add contribution guidelines here]

## License

[Add your license information here] 