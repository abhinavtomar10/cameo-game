from django.urls import path
from .views import StartGame, ConnectGame

urlpatterns = [
    path('start/', StartGame.as_view(), name='start-game'),
    path('connect/', ConnectGame.as_view(), name='connect-game'),
] 