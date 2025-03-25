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

# Set up logger
logger = logging.getLogger(__name__)

# Define health check function
def health_check(request):
    return HttpResponse("OK")

# Enhanced index view for debugging
def debug_index_view(request):
    logger.info(f"Serving index.html template at {request.path}")
    logger.info(f"Template dirs: {settings.TEMPLATES[0]['DIRS']}")
    try:
        # Use TemplateView's as_view for rendering
        view = TemplateView.as_view(template_name='index.html')
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
]

# Finally, serve React frontend for all other routes
urlpatterns += [
    re_path(r'^$', debug_index_view, name='index'),  # Use debug view for root URL
    re_path(r'^.*', TemplateView.as_view(template_name='index.html'), name='index'),
]

# Always serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)