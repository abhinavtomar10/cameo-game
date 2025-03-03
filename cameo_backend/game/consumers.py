import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .views import games, Deck

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_code = self.scope['url_route']['kwargs']['game_code']
        self.game_group = f'game_{self.game_code}'
        await self.channel_layer.group_add(self.game_group, self.channel_name)
        await self.accept()

        game = games.get(self.game_code)
        if game:
            print(f"Player connected to game {self.game_code}: player1_peeked={game.player1_peeked}, player2_peeked={game.player2_peeked}, game_started={game.game_started}, reveal_all={game.reveal_all}")
            await self.send(text_data=json.dumps({
                'type': 'game_state',
                'player1_cards': game.player1_cards,
                'player2_cards': game.player2_cards or [],
                'player1_peeked': game.player1_peeked,
                'player2_peeked': game.player2_peeked or [],
                'current_player': game.current_player,
                'game_started': game.game_started,
                'drawn_card': getattr(game, 'drawn_card', None),
                'drawn_by': getattr(game, 'drawn_by', None),
                'reveal_all': game.reveal_all
            }))

    async def disconnect(self, close_code):
        print(f"WebSocket disconnected for game {self.game_code} with code {close_code}")
        await self.channel_layer.group_discard(self.game_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            game = games.get(self.game_code)
            print(f"Received message: {data}")
            if not game:
                print(f"No game found for code {self.game_code}")
                return
            if game.game_ended:
                print(f"Game {self.game_code} already ended")
                return

            action = data['action']
            player = data['player']
            print(f"Processing action: {action} from Player {player}")

            if action == 'peek_own' and not game.game_started:
                pos = data['position']
                if player == 1 and pos in [2, 3] and not game.player1_peeked[pos]:
                    game.player1_peeked[pos] = True
                    print(f"Player 1 peeked position {pos}: player1_peeked={game.player1_peeked}")
                elif player == 2 and pos in [2, 3] and game.player2_peeked and not game.player2_peeked[pos]:
                    game.player2_peeked[pos] = True
                    print(f"Player 2 peeked position {pos}: player2_peeked={game.player2_peeked}")

                if (all(game.player1_peeked[2:4]) and 
                    game.player2_cards and game.player2_peeked and all(game.player2_peeked[2:4])):
                    game.game_started = True
                    print(f"Game {self.game_code} started: Both players have peeked bottom cards")

            elif action == 'draw' and game.game_started:
                if game.current_player != player:
                    print(f"Player {player} tried to draw, but it's not their turn (current_player={game.current_player})")
                    return
                card = game.deck.draw()[0] if game.deck.cards else None
                if card:
                    game.drawn_card = card
                    game.drawn_by = player
                    draw_message = {'type': 'game_update', 'card': card, 'player': player}
                    print(f"Player {player} drew card: {card}, deck remaining: {len(game.deck.cards)}, sending: {json.dumps(draw_message)}")
                    await self.channel_layer.group_send(self.game_group, draw_message)
                    state_message = {
                        'type': 'game_state',
                        'player1_cards': game.player1_cards,
                        'player2_cards': game.player2_cards or [],
                        'player1_peeked': game.player1_peeked,
                        'player2_peeked': game.player2_peeked or [],
                        'current_player': game.current_player,
                        'game_started': game.game_started,
                        'drawn_card': game.drawn_card,
                        'drawn_by': game.drawn_by,
                        'reveal_all': game.reveal_all
                    }
                    print(f"Sending game_state after draw: {json.dumps(state_message)}")
                    await self.channel_layer.group_send(self.game_group, state_message)
                    return

            elif action == 'discard' and game.game_started:
                if game.current_player != player or not hasattr(game, 'drawn_card') or game.drawn_by != player:
                    print(f"Player {player} tried to discard, but invalid: current_player={game.current_player}, drawn_by={game.drawn_by}")
                    return
                previous_player = game.current_player
                game.current_player = 2 if player == 1 else 1
                state_message = {
                    'type': 'game_state',
                    'player1_cards': game.player1_cards,
                    'player2_cards': game.player2_cards,
                    'player1_peeked': game.player1_peeked,
                    'player2_peeked': game.player2_peeked,
                    'current_player': game.current_player,
                    'game_started': game.game_started,
                    'drawn_card': game.drawn_card,
                    'drawn_by': game.drawn_by,
                    'reveal_all': game.reveal_all
                }
                print(f"Player {previous_player} discarded, turn switched to Player {game.current_player}, sending: {json.dumps(state_message)}")
                await self.channel_layer.group_send(self.game_group, state_message)
                return

            elif action == 'swap' and game.game_started:
                if game.current_player != player:
                    print(f"Player {player} tried to swap, but it's not their turn (current_player={game.current_player})")
                    return
                if 'pos1' in data and 'pos2' in data:  # Player-to-player swap
                    pos1 = data['pos1']  # Player 1's card position
                    pos2 = data['pos2']  # Player 2's card position
                    if not (0 <= pos1 <= 3 and 0 <= pos2 <= 3):
                        print(f"Invalid swap positions: pos1={pos1}, pos2={pos2}")
                        return
                    if player == 1:
                        game.player1_cards[pos1], game.player2_cards[pos2] = game.player2_cards[pos2], game.player1_cards[pos1]
                        print(f"Player 1 swapped card at pos {pos1} with Player 2's card at pos {pos2}")
                    else:  # player == 2
                        game.player1_cards[pos1], game.player2_cards[pos2] = game.player2_cards[pos2], game.player1_cards[pos1]
                        print(f"Player 2 swapped card at pos {pos2} with Player 1's card at pos {pos1}")
                elif 'pos' in data:  # Drawn card swap
                    if not hasattr(game, 'drawn_card') or game.drawn_by != player:
                        print(f"Player {player} tried to swap drawn card, but invalid: drawn_by={game.drawn_by}")
                        return
                    pos = data['pos']  # Player's card position
                    if not (0 <= pos <= 3):
                        print(f"Invalid swap position: pos={pos}")
                        return
                    if player == 1:
                        game.player1_cards[pos], game.drawn_card = game.drawn_card, game.player1_cards[pos]
                        print(f"Player 1 swapped drawn card with card at pos {pos}")
                    else:  # player == 2
                        game.player2_cards[pos], game.drawn_card = game.drawn_card, game.player2_cards[pos]
                        print(f"Player 2 swapped drawn card with card at pos {pos}")
                else:
                    print(f"Invalid swap data: {data}")
                    return

                state_message = {
                    'type': 'game_state',
                    'player1_cards': game.player1_cards,
                    'player2_cards': game.player2_cards,
                    'player1_peeked': game.player1_peeked,
                    'player2_peeked': game.player2_peeked,
                    'current_player': game.current_player,
                    'game_started': game.game_started,
                    'drawn_card': getattr(game, 'drawn_card', None),
                    'drawn_by': getattr(game, 'drawn_by', None),
                    'reveal_all': game.reveal_all
                }
                print(f"Sending game_state after swap: {json.dumps(state_message)}")
                await self.channel_layer.group_send(self.game_group, state_message)
                return

            elif action == 'replace' and game.game_started:
                pos = data['position']
                card = data['card']
                if player == 1:
                    game.player1_cards[pos] = card
                else:
                    game.player2_cards[pos] = card
                game.drawn_card = None
                game.drawn_by = None
                game.current_player = 2 if player == 1 else 1

            elif action == 'peek_own' and game.game_started:
                pos = data['position']
                if player == 1:
                    game.player1_peeked[pos] = True
                else:
                    game.player2_peeked[pos] = True
                game.drawn_card = None
                game.drawn_by = None
                game.current_player = 2 if player == 1 else 1

            elif action == 'peek_opponent' and game.game_started:
                pos = data['position']
                if player == 1:
                    game.player2_peeked[pos] = True
                else:
                    game.player1_peeked[pos] = True
                game.drawn_card = None
                game.drawn_by = None
                game.current_player = 2 if player == 1 else 1

            elif action == 'end_game' and game.game_started:
                print(f"End game triggered by Player {player}")
                p1_sum = sum(Deck.values[card[0]] if card[0] != 'K' or card[1] in ['C', 'S'] else 0 for card in game.player1_cards)
                p2_sum = sum(Deck.values[card[0]] if card[0] != 'K' or card[1] in ['C', 'S'] else 0 for card in game.player2_cards)
                game.winner = 'Player 1' if p1_sum < p2_sum else 'Player 2' if p2_sum < p1_sum else 'Tie'
                game.game_ended = True
                game.reveal_all = True
                end_game_message = {
                    'type': 'game_end',
                    'player1_cards': game.player1_cards,
                    'player2_cards': game.player2_cards,
                    'player1_sum': p1_sum,
                    'player2_sum': p2_sum,
                    'winner': game.winner,
                    'reveal_all': game.reveal_all
                }
                print(f"Game {self.game_code} ended: Sending game_end message: {json.dumps(end_game_message)}")
                await self.channel_layer.group_send(self.game_group, end_game_message)
                return

            state_message = {
                'type': 'game_state',
                'player1_cards': game.player1_cards,
                'player2_cards': game.player2_cards or [],
                'player1_peeked': game.player1_peeked,
                'player2_peeked': game.player2_peeked or [],
                'current_player': game.current_player,
                'game_started': game.game_started,
                'drawn_card': getattr(game, 'drawn_card', None),
                'drawn_by': getattr(game, 'drawn_by', None),
                'reveal_all': game.reveal_all
            }
            print(f"Sending game_state message after {action}: {json.dumps(state_message)}")
            await self.channel_layer.group_send(self.game_group, state_message)

        except Exception as e:
            print(f"Error processing message: {e}")
            await self.send(text_data=json.dumps({'error': str(e)}))

    async def game_update(self, event):
        print(f"Sending game_update message: {json.dumps(event)}")
        await self.send(text_data=json.dumps(event))

    async def game_state(self, event):
        print(f"Sending game_state to client: {json.dumps(event)}")
        await self.send(text_data=json.dumps(event))

    async def game_end(self, event):
        print(f"Sending game_end to client: {json.dumps(event)}")
        await self.send(text_data=json.dumps(event))