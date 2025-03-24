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

# Define health check function
def health_check(request):
    return HttpResponse("OK")

# Serve static files first
urlpatterns = [
    path('static/<path:path>', serve, {'document_root': settings.STATIC_ROOT}),
]

# Then serve API endpoints
urlpatterns += [
    path('admin/', admin.site.urls),
    path('api/', include('game.urls')),
    path('health/', health_check, name='health_check'),
]

# Finally, serve React frontend for all other routes
urlpatterns += [
    re_path(r'^.*', TemplateView.as_view(template_name='index.html'), name='index'),
]

# Always serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)