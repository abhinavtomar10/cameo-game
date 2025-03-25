/**
 * Application configuration
 * 
 * This file contains all the configuration values for the application.
 * In production, the API_BASE_URL will use the current origin.
 * In development, it will use the localhost URL.
 */

// Determine if we're in production by checking if we're being served from a domain or localhost
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Configuration object
const config = {
  // API base URL - use current origin in production, localhost in development
  API_BASE_URL: isProduction ? `${window.location.origin}` : 'http://127.0.0.1:8000',
  
  // WebSocket URL - use matching protocol (wss for https, ws for http)
  getWebSocketURL: (code) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProduction ? window.location.host : '127.0.0.1:8000';
    return `${protocol}//${host}/ws/game/${code}/`;
  }
};

export default config; 