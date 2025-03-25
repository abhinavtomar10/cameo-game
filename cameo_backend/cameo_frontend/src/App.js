import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import config from './config';

function App() {
  // Game setup state
  const [gameCode, setGameCode] = useState('');
  const [player, setPlayer] = useState(0); // 0: not in game, 1: player1, 2: player2
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [ws, setWs] = useState(null);

  // Game state variables
  const [player1Cards, setPlayer1Cards] = useState([]);
  const [player2Cards, setPlayer2Cards] = useState([]);
  const [player1Peeked, setPlayer1Peeked] = useState([]);
  const [player2Peeked, setPlayer2Peeked] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [drawnCard, setDrawnCard] = useState(null);
  const [drawnBy, setDrawnBy] = useState(null);
  const [player1Discarded, setPlayer1Discarded] = useState(false);
  const [player2Discarded, setPlayer2Discarded] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [player1Sum, setPlayer1Sum] = useState(0);
  const [player2Sum, setPlayer2Sum] = useState(0);
  const [revealAll, setRevealAll] = useState(false);

  const startGame = async () => {
    console.log("🔍 startGame function called");
    try {
      console.log("🔍 Making axios POST request to:", `${config.API_BASE_URL}/api/start/`);
      const response = await axios.post(`${config.API_BASE_URL}/api/start/`, {});
      console.log("✅ Start API response:", response.data);
      setGameCode(response.data.code);
      setPlayer(1);
      connectWebSocket(response.data.code);
    } catch (error) {
      console.error('🚨 Start Game Error:', error);
      if (error.response) {
        console.error('🔍 Error response data:', error.response.data);
        console.error('🔍 Error response status:', error.response.status);
      } else if (error.request) {
        console.error('🔍 Error request:', error.request);
      }
      
      // Try a direct fetch as fallback
      try {
        console.log("🔄 Trying direct fetch as fallback for start");
        const fetchResponse = await fetch(`${window.location.origin}/api/start/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await fetchResponse.json();
        console.log("✅ Direct fetch for start successful:", data);
        setGameCode(data.code);
        setPlayer(1);
        connectWebSocket(data.code);
      } catch (fetchError) {
        console.error('🚨 Start fetch fallback also failed:', fetchError);
        alert('Failed to start game. Please try again.');
      }
    }
  };

  const connectGame = async () => {
    console.log("🔍 connectGame function called with code:", gameCode);
    try {
      console.log("🔍 Making axios POST request to:", `${config.API_BASE_URL}/api/connect/`);
      const response = await axios.post(`${config.API_BASE_URL}/api/connect/`, { code: gameCode });
      console.log("✅ Connect API response:", response.data);
      if (!response.data.error) {
        setPlayer(2);
        connectWebSocket(response.data.code);
      } else {
        alert('Invalid or full game code');
      }
    } catch (error) {
      console.error('🚨 Connect Game Error:', error);
      if (error.response) {
        console.error('🔍 Error response data:', error.response.data);
        console.error('🔍 Error response status:', error.response.status);
      } else if (error.request) {
        console.error('🔍 Error request:', error.request);
      }
      
      // Try a direct fetch as fallback
      try {
        console.log("🔄 Trying direct fetch as fallback for connect");
        const fetchResponse = await fetch(`${window.location.origin}/api/connect/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: gameCode })
        });
        const data = await fetchResponse.json();
        console.log("✅ Direct fetch for connect successful:", data);
        if (!data.error) {
          setPlayer(2);
          connectWebSocket(data.code);
        } else {
          alert('Invalid or full game code');
        }
      } catch (fetchError) {
        console.error('🚨 Connect fetch fallback also failed:', fetchError);
        alert('Failed to connect to game. Please try again.');
      }
    }
  };

  const connectWebSocket = (code) => {
    console.log("🔍 connectWebSocket function called with code:", code);
    try {
      const wsUrl = config.getWebSocketURL(code);
      console.log("🔍 Creating WebSocket connection to:", wsUrl);
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log("✅ WebSocket connected successfully");
      };
      
      websocket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('📩 WebSocket Message:', JSON.stringify(data));
          if (data.type === 'game_state') {
            setPlayer1Cards(data.player1_cards);
            setPlayer2Cards(data.player2_cards || []);
            setPlayer1Peeked(data.player1_peeked);
            setPlayer2Peeked(data.player2_peeked || []);
            setCurrentPlayer(data.current_player);
            setGameStarted(data.game_started);
            if (data.drawn_card !== undefined) setDrawnCard(data.drawn_card);
            if (data.drawn_by !== undefined) setDrawnBy(data.drawn_by);
            setRevealAll(data.reveal_all || false);
          } else if (data.type === 'game_update') {
            setDrawnCard(data.card);
            setDrawnBy(data.player);
            setPlayer1Discarded(false);
            setPlayer2Discarded(false);
          } else if (data.type === 'game_end') {
            setPlayer1Cards(data.player1_cards);
            setPlayer2Cards(data.player2_cards);
            setPlayer1Sum(data.player1_sum);
            setPlayer2Sum(data.player2_sum);
            setWinner(data.winner);
            setGameEnded(true);
            setDrawnCard(null);
            setDrawnBy(null);
            setPlayer1Discarded(false);
            setPlayer2Discarded(false);
            setRevealAll(data.reveal_all !== undefined ? data.reveal_all : true);
          }
        } catch (err) {
          console.error('🚨 Error processing WebSocket message:', err);
          console.log('📩 Raw message data:', e.data);
        }
      };
      
      websocket.onerror = (e) => {
        console.error('🚨 WebSocket Error:', e);
      };
      
      websocket.onclose = (e) => {
        console.log('🔌 WebSocket closed with code:', e.code, 'reason:', e.reason);
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('🚨 Error creating WebSocket:', error);
      
      // Try a fallback with direct WebSocket
      try {
        console.log("🔄 Trying fallback WebSocket connection");
        const fallbackUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
                            window.location.host + '/ws/game/' + code + '/';
        console.log("🔍 Fallback WebSocket URL:", fallbackUrl);
        
        const fallbackWs = new WebSocket(fallbackUrl);
        fallbackWs.onopen = () => console.log('✅ Fallback WebSocket connected');
        fallbackWs.onmessage = (e) => {
          const data = JSON.parse(e.data);
          console.log('📩 Fallback WebSocket Message:', data);
          // Same handlers as above
          if (data.type === 'game_state') {
            setPlayer1Cards(data.player1_cards);
            setPlayer2Cards(data.player2_cards || []);
            setPlayer1Peeked(data.player1_peeked);
            setPlayer2Peeked(data.player2_peeked || []);
            setCurrentPlayer(data.current_player);
            setGameStarted(data.game_started);
            if (data.drawn_card !== undefined) setDrawnCard(data.drawn_card);
            if (data.drawn_by !== undefined) setDrawnBy(data.drawn_by);
            setRevealAll(data.reveal_all || false);
          } else if (data.type === 'game_update') {
            setDrawnCard(data.card);
            setDrawnBy(data.player);
            setPlayer1Discarded(false);
            setPlayer2Discarded(false);
          } else if (data.type === 'game_end') {
            setPlayer1Cards(data.player1_cards);
            setPlayer2Cards(data.player2_cards);
            setPlayer1Sum(data.player1_sum);
            setPlayer2Sum(data.player2_sum);
            setWinner(data.winner);
            setGameEnded(true);
            setDrawnCard(null);
            setDrawnBy(null);
            setPlayer1Discarded(false);
            setPlayer2Discarded(false);
            setRevealAll(data.reveal_all !== undefined ? data.reveal_all : true);
          }
        };
        fallbackWs.onerror = (e) => console.error('🚨 Fallback WebSocket Error:', e);
        fallbackWs.onclose = () => console.log('🔌 Fallback WebSocket closed');
        setWs(fallbackWs);
      } catch (fallbackError) {
        console.error('🚨 Fallback WebSocket also failed:', fallbackError);
      }
    }
  };

  const sendGameAction = (action, data = {}) => {
    if (!ws) return;
    
    try {
      const message = {
        type: 'action',
        action: action,
        player: player,
        ...data
      };
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending game action:', error);
    }
  };

  const startGameAction = () => {
    sendGameAction('start_game');
  };

  const drawCard = () => {
    if (currentPlayer !== player) return;
    sendGameAction('draw_card');
  };

  const keepCard = () => {
    if (drawnBy !== player) return;
    sendGameAction('keep_card');
  };

  const discardCard = () => {
    if (drawnBy !== player) return;
    sendGameAction('discard_card');
  };

  const peekCard = (position) => {
    sendGameAction('peek_card', { position });
  };

  const handleGameCodeChange = (e) => {
    setGameCode(e.target.value.toUpperCase());
  };

  const resetGame = () => {
    if (ws) {
      ws.close();
    }
    setGameCode('');
    setPlayer(0);
    setGameStarted(false);
    setGameEnded(false);
    setWinner(null);
    setPlayer1Cards([]);
    setPlayer2Cards([]);
    setDrawnCard(null);
    setDrawnBy(null);
  };

  // Clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const renderCard = (card, index, isPlayerCard, isPeeked) => {
    const isRevealed = revealAll || isPeeked;
    return (
      <div 
        key={index} 
        className={`card ${isRevealed ? 'revealed' : ''}`}
        onClick={() => isPlayerCard && !isRevealed && peekCard(index)}
      >
        {isRevealed ? card : '?'}
      </div>
    );
  };

  const renderGameBoard = () => {
    const isMyTurn = currentPlayer === player;
    const canDraw = isMyTurn && drawnCard === null;
    const canKeepOrDiscard = drawnBy === player && drawnCard !== null;
    
    return (
      <div className="game-board">
        {gameEnded ? (
          <div className="game-end">
            <h2>Game Over!</h2>
            <p>Player 1 Sum: {player1Sum}</p>
            <p>Player 2 Sum: {player2Sum}</p>
            <p>Winner: {winner === 0 ? 'Tie!' : `Player ${winner}`}</p>
            <button onClick={resetGame}>New Game</button>
          </div>
        ) : (
          <>
            <div className="game-status">
              <p>Game Code: {gameCode}</p>
              <p>You are Player {player}</p>
              <p>Current Turn: Player {currentPlayer}</p>
            </div>
            
            <div className="player-area player1-area">
              <h3>Player 1 Cards</h3>
              <div className="player-cards">
                {player1Cards.map((card, index) => 
                  renderCard(card, index, player === 1, player1Peeked.includes(index))
                )}
              </div>
            </div>
            
            <div className="player-area player2-area">
              <h3>Player 2 Cards</h3>
              <div className="player-cards">
                {player2Cards.map((card, index) => 
                  renderCard(card, index, player === 2, player2Peeked.includes(index))
                )}
              </div>
            </div>
            
            <div className="game-actions">
              {!gameStarted && player === 1 && (
                <button onClick={startGameAction}>Start Game</button>
              )}
              
              {gameStarted && canDraw && (
                <button onClick={drawCard}>Draw Card</button>
              )}
              
              {drawnCard !== null && (
                <div className="drawn-card">
                  <p>Drawn Card: {drawnCard}</p>
                  {canKeepOrDiscard && (
                    <div className="card-actions">
                      <button onClick={keepCard}>Keep Card</button>
                      <button onClick={discardCard}>Discard Card</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cameo Card Game</h1>
      </header>
      
      <main className="App-main">
        {player === 0 ? (
          <div className="game-start-options">
            <div className="start-game-option">
              <h2>Start New Game</h2>
              <button onClick={startGame}>Start Game</button>
            </div>
            
            <div className="connect-game-option">
              <h2>Join Existing Game</h2>
              <input 
                type="text" 
                placeholder="Enter Game Code" 
                value={gameCode}
                onChange={handleGameCodeChange}
                maxLength={6}
              />
              <button onClick={connectGame}>Connect</button>
            </div>
          </div>
        ) : (
          renderGameBoard()
        )}
      </main>
    </div>
  );
}

export default App; 