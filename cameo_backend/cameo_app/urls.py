from django.urls import path
from . import views

urlpatterns = [
    path('api/start/', views.start_game, name='start_game'),
    path('api/connect/', views.connect_game, name='connect_game'),
    path('api/health/', views.health_check, name='health_check'),
] 