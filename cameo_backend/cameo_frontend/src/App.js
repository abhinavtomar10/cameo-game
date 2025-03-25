import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import config from './config';

function App() {
  const [gameCode, setGameCode] = useState('');
  const [player, setPlayer] = useState(0);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [socket, setSocket] = useState(null);

  // Function to connect to WebSocket
  const connectWebSocket = (code) => {
    // Use config to get WebSocket URL
    const wsUrl = config.getWebSocketURL(code);
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };
    
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      console.log('Raw WebSocket Message:', JSON.stringify(data));
      
      if (data.type === 'game_state') {
        setGameState(data.state);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    setSocket(ws);
  };

  // Function to start a new game
  const startGame = async () => {
    try {
      // Use config for API URL
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

  // Function to connect to an existing game
  const connectGame = async () => {
    try {
      // Use config for API URL
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cameo Card Game</h1>
      </header>
      <main>
        {!player ? (
          <div className="game-start">
            <div className="start-options">
              <button onClick={startGame}>Start Game</button>
              <div className="join-game">
                <input 
                  type="text" 
                  value={gameCode} 
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())} 
                  placeholder="Enter Game Code" 
                  maxLength="6"
                />
                <button onClick={connectGame}>Connect</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="game-board">
            <h2>Game Code: {gameCode}</h2>
            <p>You are Player {player}</p>
            <p>Connection Status: {connected ? 'Connected' : 'Disconnected'}</p>
            {gameState && (
              <div className="game-status">
                <pre>{JSON.stringify(gameState, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 