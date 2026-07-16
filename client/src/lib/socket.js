import { io } from 'socket.io-client';

const PROD_URL = 'https://www.iberzo.com';

// Capacitor native app or standard production build → always use prod URL
function getServerUrl() {
  if (typeof window !== 'undefined' && window.Capacitor) return PROD_URL;
  if (import.meta.env.PROD) return window.location.origin;
  return `http://${window.location.hostname}:3001`;
}

let socket = null;
let currentToken = null;

export function getSocket(token) {
  // If the token changed (re-login after expiry), tear down the old socket
  // so the new one authenticates with the fresh token instead of silently
  // reusing a socket the server already rejected.
  if (socket && token !== currentToken) {
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    currentToken = token;
    socket = io(getServerUrl(), {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
  currentToken = null;
}
