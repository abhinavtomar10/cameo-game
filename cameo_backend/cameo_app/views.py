from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
import random
import string
import json
import logging

# Set up logger
logger = logging.getLogger(__name__)

# Dictionary to store game states
games = {}

@api_view(['GET'])
def health_check(request):
    """
    Simple health check endpoint to verify the API is running
    """
    data = {
        'status': 'ok',
        'message': 'API server is running',
        'environment': {
            'hostname': request.get_host(),
            'protocol': 'https' if request.is_secure() else 'http',
            'path': request.path,
        }
    }
    return Response(data)

@api_view(['POST'])
def start_game(request):
    """
    Start a new game and return the game code
    """
    logger.info("Start game endpoint called")
    
    # Generate a random game code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    # Initialize game state
    games[code] = {
        'player1_cards': [],
        'player2_cards': [],
        'player1_connected': True,
        'player2_connected': False,
        'game_started': False,
        'current_player': 1
    }
    
    logger.info(f"Created new game with code: {code}")
    
    return Response({
        'code': code,
        'message': 'Game created successfully'
    })

@api_view(['POST'])
def connect_game(request):
    """
    Connect to an existing game using a game code
    """
    logger.info("Connect game endpoint called")
    
    try:
        data = json.loads(request.body)
        code = data.get('code')
        
        if not code:
            logger.error("No code provided in request")
            return Response({'error': True, 'message': 'Game code is required'})
        
        if code not in games:
            logger.error(f"Invalid game code: {code}")
            return Response({'error': True, 'message': 'Invalid game code'})
        
        if games[code]['player2_connected']:
            logger.error(f"Game {code} is already full")
            return Response({'error': True, 'message': 'Game is already full'})
        
        # Mark player 2 as connected
        games[code]['player2_connected'] = True
        logger.info(f"Player 2 connected to game {code}")
        
        return Response({
            'code': code,
            'message': 'Connected to game successfully'
        })
    
    except Exception as e:
        logger.error(f"Error in connect_game: {str(e)}")
        return Response({'error': True, 'message': f'Error: {str(e)}'}) 