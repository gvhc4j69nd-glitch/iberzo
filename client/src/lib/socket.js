import { io } from 'socket.io-client';

const PROD_URL = 'https://www.iberzo.com';

// Capacitor native app or standard production build → always use prod URL
function getServerUrl() {
  if (typeof window !== 'undefined' && window.Capacitor) return PROD_URL;
  if (import.meta.env.PROD) return window.location.origin;
  return `http://${window.location.hostname}:3001`;
}

let socket = null;

export function getSocket(token) {
  if (!socket) {
    socket = io(getServerUrl(), { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
