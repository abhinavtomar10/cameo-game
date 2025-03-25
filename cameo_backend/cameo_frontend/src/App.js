import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import config from './config';

function App() {
  const [gameCode, setGameCode] = useState('');
  const [player, setPlayer] = useState(null);
  const [ws, setWs] = useState(null);
  const [player1Cards, setPlayer1Cards] = useState(null);
  const [player2Cards, setPlayer2Cards] = useState(null);
  const [player1Peeked, setPlayer1Peeked] = useState([]);
  const [player2Peeked, setPlayer2Peeked] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [drawnCard, setDrawnCard] = useState(null);
  const [drawnBy, setDrawnBy] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [player1Sum, setPlayer1Sum] = useState(null);
  const [player2Sum, setPlayer2Sum] = useState(null);
  const [flippedCard, setFlippedCard] = useState(null);
  const [hasPeekedBottomLeft, setHasPeekedBottomLeft] = useState(false);
  const [hasPeekedBottomRight, setHasPeekedBottomRight] = useState(false);
  const [tempPeekedPos, setTempPeekedPos] = useState(null);
  const [draggingCard, setDraggingCard] = useState(null);
  const [player1Discarded, setPlayer1Discarded] = useState(false);
  const [player2Discarded, setPlayer2Discarded] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [tempPeekedCard, setTempPeekedCard] = useState(null);
  const [showRules, setShowRules] = useState(false);

  const startGame = async () => {
    try {
      const response = await axios.post(`${config.API_BASE_URL}/api/start/`, {}, {
        headers: { 'Content-Type': 'application/json' }
      });
      setGameCode(response.data.code);
      setPlayer(1);
      connectWebSocket(response.data.code);
    } catch (error) {
      console.error('Start Game Error:', error.message);
    }
  };

  const connectGame = async () => {
    try {
      const response = await axios.post(`${config.API_BASE_URL}/api/connect/`, { code: gameCode });
      if (!response.data.error) {
        setPlayer(2);
        connectWebSocket(response.data.code);
      } else {
        alert('Invalid or full game code');
      }
    } catch (error) {
      console.error('Connect Game Error:', error.message);
    }
  };

  const connectWebSocket = (code) => {
    const websocket = new WebSocket(config.getWebSocketURL(code));
    websocket.onopen = () => console.log('WebSocket connected');
    websocket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log('Raw WebSocket Message:', JSON.stringify(data));
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
    websocket.onerror = (e) => console.error('WebSocket Error:', e);
    websocket.onclose = () => console.log('WebSocket closed');
    setWs(websocket);
  };

  const sendAction = (action, extra = {}) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, player, ...extra }));
    }
  };

  const getCardImage = (card, isFlipped) => {
    if (!card || !isFlipped) return '/static//cards/back.png';
    const [rank, suit] = card;
    return `/static//cards/${rank}${suit}.png`;
  };

  const handleCardFlip = (pos) => {
    if (gameStarted || (pos !== 2 && pos !== 3) || gameEnded) return;
    if (pos === 2 && hasPeekedBottomLeft) return;
    if (pos === 3 && hasPeekedBottomRight) return;

    setFlippedCard(pos);
    sendAction('peek_own', { position: pos });
    setTimeout(() => {
      setFlippedCard(null);
      if (pos === 2) setHasPeekedBottomLeft(true);
      if (pos === 3) setHasPeekedBottomRight(true);
    }, 2000);
  };

  const handlePeekOwn = (pos) => {
    setTempPeekedPos(pos);
    sendAction('peek_own', { position: pos });
    setTimeout(() => setTempPeekedPos(null), 2000);
  };

  const handlePeekOpponent = (pos) => {
    setTempPeekedPos(pos);
    sendAction('peek_opponent', { position: pos });
    setTimeout(() => setTempPeekedPos(null), 2000);
  };

  const handleReplace = (pos) => {
    sendAction('replace', { position: pos, card: drawnCard });
    setDrawnCard(null);
    setDrawnBy(null);
  };

  const handleSwap = (pos1, pos2) => {
    sendAction('swap', { pos1, pos2 });
  };

  const handleSwapDrawn = (pos) => {
    sendAction('swap', { pos });
  };

  const handleDragStart = (pos) => {
    if ((player === 1 && currentPlayer === 1) || (player === 2 && currentPlayer === 2)) {
      setDraggingCard(pos);
    }
  };

  const handleDragStartDrawn = () => {
    if (currentPlayer === player && drawnBy === player) {
      setDraggingCard('drawn');
    }
  };

  const handleDrop = (targetPos) => {
    if (draggingCard !== null && currentPlayer === player) {
      if (draggingCard === 'drawn') {
        handleSwapDrawn(targetPos);
      } else {
        if (player === 1) {
          handleSwap(draggingCard, targetPos);
        } else if (player === 2) {
          handleSwap(targetPos, draggingCard);
        }
      }
    }
    setDraggingCard(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDiscard = () => {
    if (player === 1) {
      setPlayer1Discarded(true);
      sendAction('discard');
    } else if (player === 2) {
      setPlayer2Discarded(true);
      sendAction('discard');
    }
  };

  const handlePeek = (pos, isPlayer1Cards) => {
    const cardSet = isPlayer1Cards ? player1Cards : player2Cards;
    const peekedSet = isPlayer1Cards ? player1Peeked : player2Peeked;
    if (cardSet && !peekedSet[pos]) {
      setTempPeekedCard({ pos, isPlayer1Cards });
      setTimeout(() => setTempPeekedCard(null), 2000);
    }
  };

  const renderCards = (cards, peeked, isOwnCards) => {
    const defaultCards = Array(4).fill(null);
    const displayCards = cards || defaultCards;
    const isPlayer1Cards = (player === 1 && isOwnCards) || (player === 2 && !isOwnCards);
    return (
      <div className="cards">
        <div className="card-row">
          {[0, 1].map(pos => (
            <img
              key={pos}
              src={getCardImage(displayCards[pos], revealAll || (isOwnCards && tempPeekedPos === pos) || (tempPeekedCard && tempPeekedCard.pos === pos && tempPeekedCard.isPlayer1Cards === isPlayer1Cards))}
              alt={`Card ${pos + 1}`}
              className="card-image"
              draggable={isOwnCards && currentPlayer === player}
              onDragStart={isOwnCards ? () => handleDragStart(pos) : null}
              onDrop={!isOwnCards ? () => handleDrop(pos) : (isOwnCards && currentPlayer === player ? () => handleDrop(pos) : null)}
              onDragOver={handleDragOver}
              onClick={() => handlePeek(pos, isPlayer1Cards)}
            />
          ))}
        </div>
        <div className="card-row">
          {[2, 3].map(pos => (
            <img
              key={pos}
              src={getCardImage(displayCards[pos], revealAll || (isOwnCards && (flippedCard === pos || tempPeekedPos === pos)) || (tempPeekedCard && tempPeekedCard.pos === pos && tempPeekedCard.isPlayer1Cards === isPlayer1Cards))}
              alt={`Card ${pos + 1}`}
              className="card-image"
              draggable={isOwnCards && currentPlayer === player}
              onDragStart={isOwnCards ? () => handleDragStart(pos) : null}
              onDrop={!isOwnCards ? () => handleDrop(pos) : (isOwnCards && currentPlayer === player ? () => handleDrop(pos) : null)}
              onDragOver={handleDragOver}
              onClick={isOwnCards && !gameStarted ? () => handleCardFlip(pos) : () => handlePeek(pos, isPlayer1Cards)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <h1>Cameo Card Game</h1>
      <button className="rules-button" onClick={() => setShowRules(true)}>Rules</button>
      {!player ? (
        <div className="lobby">
          <button onClick={startGame}>Start Game</button>
          <input
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value)}
            placeholder="Enter 6-digit code"
          />
          <button onClick={connectGame}>Connect</button>
        </div>
      ) : (
        <div className="game">
          <p>Game Code: {gameCode} | You are Player {player} | Current Turn: Player {currentPlayer}</p>
          <div className="players-container">
            <div className="player">
              <h2>Player 1</h2>
              {renderCards(player1Cards, player1Peeked, player === 1)}
            </div>
            <div className="player">
              <h2>Player 2</h2>
              {renderCards(player2Cards, player2Peeked, player === 2)}
            </div>
          </div>
          {drawnCard && !(player === 1 ? player1Discarded : player2Discarded) && (
            <div className="drawn-card">
              <p>Drawn Card: <img 
                src={getCardImage(drawnCard, true)} 
                alt="Drawn" 
                className="card-image" 
                draggable={currentPlayer === player && drawnBy === player}
                onDragStart={handleDragStartDrawn}
              /></p>
              {currentPlayer === player && drawnBy === player && (
                <button onClick={handleDiscard}>Discard</button>
              )}
            </div>
          )}
          {!gameEnded && (
            <div className="controls">
              {gameStarted ? (
                <>
                  <button onClick={() => sendAction('draw')} disabled={currentPlayer !== player}>
                    Draw Card
                  </button>
                  <button onClick={() => sendAction('end_game')} disabled={currentPlayer !== player}>
                    End Game
                  </button>
                </>
              ) : (
                <p>Waiting for both players to flip bottom cards</p>
              )}
            </div>
          )}
          {gameEnded && (
            <div className="result">
              <h3>Winner: {winner}</h3>
              <p>Player 1 Sum: {player1Sum}</p>
              <p>Player 2 Sum: {player2Sum}</p>
            </div>
          )}
        </div>
      )}

      {showRules && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Game Rules</h2>
            <iframe
              src="/static/cameo_game_rules.pdf"
              title="Cameo Game Rules"
              width="100%"
              height="500px"
            />
            <button onClick={() => setShowRules(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 