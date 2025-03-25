import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

# Set up logger
logger = logging.getLogger(__name__)

# Store active WebSocket connections by game code
active_connections = {}

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Handle WebSocket connection
        """
        self.game_code = self.scope['url_route']['kwargs']['game_code']
        self.game_group_name = f'game_{self.game_code}'
        
        # Log connection attempt
        logger.info(f"WebSocket connection attempt for game: {self.game_code}")
        
        # Join the game group
        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )
        
        # Accept the connection
        await self.accept()
        
        # Store the connection
        if self.game_code not in active_connections:
            active_connections[self.game_code] = []
        active_connections[self.game_code].append(self)
        
        logger.info(f"WebSocket connected for game: {self.game_code}")
        
        # Send initial game state
        await self.send_game_state()
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        logger.info(f"WebSocket disconnected for game: {self.game_code} with code: {close_code}")
        
        # Leave the game group
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )
        
        # Remove from active connections
        if self.game_code in active_connections:
            if self in active_connections[self.game_code]:
                active_connections[self.game_code].remove(self)
            if not active_connections[self.game_code]:
                del active_connections[self.game_code]
    
    async def receive(self, text_data):
        """
        Receive message from WebSocket
        """
        try:
            text_data_json = json.loads(text_data)
            logger.info(f"Received WebSocket message: {text_data_json}")
            
            message_type = text_data_json.get('type')
            
            if message_type == 'action':
                # Handle game actions
                action = text_data_json.get('action')
                if action == 'start_game':
                    await self.start_game()
                elif action == 'draw_card':
                    player = text_data_json.get('player')
                    await self.draw_card(player)
                elif action == 'keep_card':
                    player = text_data_json.get('player')
                    await self.keep_card(player)
                elif action == 'discard_card':
                    player = text_data_json.get('player')
                    await self.discard_card(player)
                elif action == 'peek_card':
                    player = text_data_json.get('player')
                    position = text_data_json.get('position')
                    await self.peek_card(player, position)
            
        except json.JSONDecodeError:
            logger.error(f"Failed to decode WebSocket message: {text_data}")
    
    async def send_game_state(self):
        """
        Send current game state to the client
        """
        from cameo_app.views import games
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Create a message with the game state
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            'player1_cards': game_state.get('player1_cards', []),
            'player2_cards': game_state.get('player2_cards', []),
            'player1_peeked': game_state.get('player1_peeked', []),
            'player2_peeked': game_state.get('player2_peeked', []),
            'current_player': game_state.get('current_player', 1),
            'game_started': game_state.get('game_started', False),
            'drawn_card': game_state.get('drawn_card'),
            'drawn_by': game_state.get('drawn_by')
        }))
    
    async def start_game(self):
        """
        Start the game
        """
        from cameo_app.views import games
        import random
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Initialize cards for both players
        cards = list(range(1, 11))
        random.shuffle(cards)
        
        game_state['player1_cards'] = cards[:4]
        game_state['player2_cards'] = cards[4:8]
        game_state['deck'] = cards[8:]
        game_state['player1_peeked'] = []
        game_state['player2_peeked'] = []
        game_state['game_started'] = True
        game_state['current_player'] = 1
        
        # Broadcast game state to all clients in the group
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'broadcast_game_state',
            }
        )
    
    async def draw_card(self, player):
        """
        Draw a card from the deck
        """
        from cameo_app.views import games
        import random
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Check if it's the player's turn
        if game_state['current_player'] != player:
            return
        
        # Draw a card from the deck
        if game_state['deck']:
            card = game_state['deck'].pop(0)
            game_state['drawn_card'] = card
            game_state['drawn_by'] = player
            
            # Broadcast the game update
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'broadcast_game_update',
                    'card': card,
                    'player': player
                }
            )
    
    async def keep_card(self, player):
        """
        Keep the drawn card and discard one from hand
        """
        from cameo_app.views import games
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Check if player has drawn a card
        if game_state['drawn_by'] != player or game_state['drawn_card'] is None:
            return
        
        # Add card to player's hand
        if player == 1:
            game_state['player1_cards'].append(game_state['drawn_card'])
        else:
            game_state['player2_cards'].append(game_state['drawn_card'])
        
        # Reset drawn card
        game_state['drawn_card'] = None
        game_state['drawn_by'] = None
        
        # Switch to the other player's turn
        game_state['current_player'] = 2 if player == 1 else 1
        
        # Check if game should end
        if not game_state['deck']:
            await self.end_game()
        else:
            # Broadcast updated game state
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'broadcast_game_state',
                }
            )
    
    async def discard_card(self, player):
        """
        Discard the drawn card
        """
        from cameo_app.views import games
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Check if player has drawn a card
        if game_state['drawn_by'] != player or game_state['drawn_card'] is None:
            return
        
        # Reset drawn card
        game_state['drawn_card'] = None
        game_state['drawn_by'] = None
        
        # Switch to the other player's turn
        game_state['current_player'] = 2 if player == 1 else 1
        
        # Check if game should end
        if not game_state['deck']:
            await self.end_game()
        else:
            # Broadcast updated game state
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'broadcast_game_state',
                }
            )
    
    async def peek_card(self, player, position):
        """
        Peek at a card in hand
        """
        from cameo_app.views import games
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Record that player peeked at this position
        if player == 1:
            if position not in game_state['player1_peeked']:
                game_state['player1_peeked'].append(position)
        else:
            if position not in game_state['player2_peeked']:
                game_state['player2_peeked'].append(position)
        
        # Broadcast updated game state
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'broadcast_game_state',
            }
        )
    
    async def end_game(self):
        """
        End the game and calculate scores
        """
        from cameo_app.views import games
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Calculate sums for each player
        player1_sum = sum(game_state['player1_cards'])
        player2_sum = sum(game_state['player2_cards'])
        
        # Determine winner
        winner = 1 if player1_sum < player2_sum else 2 if player2_sum < player1_sum else 0
        
        # Broadcast game end
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'broadcast_game_end',
                'player1_cards': game_state['player1_cards'],
                'player2_cards': game_state['player2_cards'],
                'player1_sum': player1_sum,
                'player2_sum': player2_sum,
                'winner': winner,
                'reveal_all': True
            }
        )
    
    async def broadcast_game_state(self, event):
        """
        Broadcast game state to WebSocket
        """
        from cameo_app.views import games
        
        if self.game_code not in games:
            logger.error(f"Game {self.game_code} not found")
            return
        
        game_state = games[self.game_code]
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            'player1_cards': game_state.get('player1_cards', []),
            'player2_cards': game_state.get('player2_cards', []),
            'player1_peeked': game_state.get('player1_peeked', []),
            'player2_peeked': game_state.get('player2_peeked', []),
            'current_player': game_state.get('current_player', 1),
            'game_started': game_state.get('game_started', False),
            'drawn_card': game_state.get('drawn_card'),
            'drawn_by': game_state.get('drawn_by')
        }))
    
    async def broadcast_game_update(self, event):
        """
        Broadcast game update to WebSocket
        """
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'card': event['card'],
            'player': event['player']
        }))
    
    async def broadcast_game_end(self, event):
        """
        Broadcast game end to WebSocket
        """
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_end',
            'player1_cards': event['player1_cards'],
            'player2_cards': event['player2_cards'],
            'player1_sum': event['player1_sum'],
            'player2_sum': event['player2_sum'],
            'winner': event['winner'],
            'reveal_all': event['reveal_all']
        })) 