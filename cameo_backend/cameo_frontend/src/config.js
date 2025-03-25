/**
 * Configuration file that provides API and WebSocket URLs
 * It automatically detects whether the app is running in development or production
 */

// Determine if we're running in production
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

// Set the API base URL
const API_BASE_URL = isProduction 
  ? window.location.origin 
  : 'http://127.0.0.1:8000';

// WebSocket URL generator
const getWebSocketURL = (code) => {
  // Determine WebSocket protocol based on page protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // In production, use the same host as the page
  if (isProduction) {
    return `${protocol}//${window.location.host}/ws/game/${code}/`;
  }
  
  // In development, use localhost:8000
  return `ws://127.0.0.1:8000/ws/game/${code}/`;
};

// Log configuration for debugging
console.log('📝 Configuration loaded:');
console.log('📝 isProduction:', isProduction);
console.log('📝 API_BASE_URL:', API_BASE_URL);
console.log('📝 WebSocket URL example:', getWebSocketURL('TEST123'));

// Export the configuration
const config = {
  API_BASE_URL,
  getWebSocketURL,
  isProduction
};

export default config; 