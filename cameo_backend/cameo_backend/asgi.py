"""
ASGI config for cameo_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cameo_backend.settings')
django.setup()

# Import after Django setup
from cameo_app.consumers import GameConsumer

# Define WebSocket URL patterns
websocket_urlpatterns = [
    path('ws/game/<str:game_code>/', GameConsumer.as_asgi()),
]

# Configure the ASGI application
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
