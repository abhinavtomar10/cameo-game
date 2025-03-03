from django.shortcuts import render
from django.http import FileResponse, Http404
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
import random
import os

class Deck:
    suits = ['H', 'D', 'C', 'S']
    ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    values = {'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13}

    def __init__(self):
        self.cards = [(rank, suit) for suit in self.suits for rank in self.ranks]
        random.shuffle(self.cards)

    def draw(self, num=1):
        return [self.cards.pop() for _ in range(min(num, len(self.cards)))]

class GameState:
    def __init__(self, code):
        self.code = code
        self.deck = Deck()
        self.player1_cards = self.deck.draw(4)
        self.player2_cards = None
        self.player1_peeked = [False] * 4
        self.player2_peeked = None
        self.current_player = 1
        self.game_ended = False
        self.winner = None
        self.game_started = False
        self.drawn_card = None
        self.drawn_by = None
        self.reveal_all = False  # Define reveal_all here

games = {}

def index(request):
    return render(request, 'index.html')

#@xframe_options_exempt
#def serve_rules_pdf(request):
#    pdf_path = os.path.join(settings.STATIC_ROOT, 'cameo_game_rules.pdf')
#    if not os.path.exists(pdf_path):
#        raise Http404(f"PDF file not found at: {pdf_path}")
#    response = FileResponse(open(pdf_path, 'rb'), content_type='application/pdf')
#    response['X-Frame-Options'] = 'SAMEORIGIN'  # Explicitly set to allow framing
#    return response

class StartGame(APIView):
    def post(self, request):
        code = str(random.randint(100000, 999999))
        games[code] = GameState(code)
        return Response({'code': code, 'player': 1})

class ConnectGame(APIView):
    def post(self, request):
        code = request.data.get('code')
        print(f"Connect attempt with code: {code}")
        if code in games:
            if games[code].player2_cards is None:
                games[code].player2_cards = games[code].deck.draw(4)
                games[code].player2_peeked = [False] * 4
                print(f"Player 2 connected to game {code}")
                return Response({'code': code, 'player': 2})
            else:
                print(f"Game {code} already full")
                return Response({'error': 'Game already full'}, status=400)
        print(f"Invalid game code: {code}")
        return Response({'error': 'Invalid game code'}, status=400)