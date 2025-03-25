"""
URL configuration for cameo_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, re_path, include
from django.views.generic import TemplateView
from django.views.static import serve
from game import views
from game.views import StartGame, ConnectGame
from django.http import HttpResponse
import logging
import os
from django.shortcuts import render
import datetime

# Set up logger
logger = logging.getLogger(__name__)

# Simple debug view to verify the server is running
def debug_view(request):
    import sys
    import django
    
    # Get safe URL patterns - handle errors gracefully
    try:
        from django.urls import get_resolver
        url_patterns = [str(pattern.pattern) for pattern in get_resolver().url_patterns]
    except Exception as e:
        url_patterns = [f"Error getting URL patterns: {str(e)}"]
    
    # Get all environment variables (redacted for security)
    env_vars = {}
    for key, value in os.environ.items():
        if any(secret in key.lower() for secret in ['key', 'secret', 'pass', 'token']):
            env_vars[key] = '***REDACTED***'
        else:
            # Truncate long values
            env_vars[key] = value if len(str(value)) < 100 else f"{str(value)[:100]}..."
    
    debug_info = {
        'current_time': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'django_version': django.get_version(),
        'python_version': sys.version,
        'settings_module': os.environ.get('DJANGO_SETTINGS_MODULE', 'Not set'),
        'debug_mode': getattr(settings, 'DEBUG', 'Not set'),
        'allowed_hosts': getattr(settings, 'ALLOWED_HOSTS', 'Not set'),
        'static_root': getattr(settings, 'STATIC_ROOT', 'Not set'),
        'base_dir': getattr(settings, 'BASE_DIR', 'Not set'),
        'urls': url_patterns,
        'current_path': request.path,
        'port': os.environ.get('PORT', 'Not set'),
        'environment': env_vars,
    }
    
    # Log some diagnostic information
    logger.info(f"Debug view accessed from {request.META.get('REMOTE_ADDR')} at {debug_info['current_time']}")
    
    return render(request, 'debug.html', {'debug_info': debug_info})

# Health check view
def health_check(request):
    return HttpResponse("OK")

# Enhanced index view for debugging
def debug_index_view(request):
    logger.info(f"Serving index.html template at {request.path}")
    logger.info(f"Template dirs: {settings.TEMPLATES[0]['DIRS']}")
    
    # Check for React build template
    react_template_path = os.path.join(settings.BASE_DIR, 'templates', 'react.html')
    if os.path.exists(react_template_path):
        logger.info(f"Found custom React template at {react_template_path}")
        template_name = 'react.html'
    else:
        # Check for React build
        react_index_path = os.path.join(settings.BASE_DIR, 'cameo_frontend', 'build', 'index.html')
        if os.path.exists(react_index_path):
            logger.info(f"Found React build at {react_index_path}")
            template_name = 'index.html'
        else:
            # Use fallback template
            logger.warning("React build not found, using fallback template")
            template_name = 'index.html'  # This will use the fallback in templates/index.html
    
    try:
        # Use TemplateView's as_view for rendering
        view = TemplateView.as_view(template_name=template_name)
        response = view(request)
        logger.info(f"Response status code: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Error rendering index: {str(e)}")
        return HttpResponse(f"Error rendering index: {str(e)}", status=500)

# Serve static files first
urlpatterns = [
    path('static/<path:path>', serve, {'document_root': settings.STATIC_ROOT}),
]

# Then serve API endpoints
urlpatterns += [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/', include('game.urls')),
    path('debug/', debug_view, name='debug_view'),
]

# Finally, serve React frontend for all other routes
urlpatterns += [
    re_path(r'^$', debug_index_view, name='index'),  # Use debug view for root URL
    re_path(r'^.*', debug_index_view, name='catch_all'),  # Use debug view for all routes
]

# Always serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Add debug handler if in debug mode
if settings.DEBUG:
    urlpatterns += [
        path('__debug__/', debug_view),
    ]