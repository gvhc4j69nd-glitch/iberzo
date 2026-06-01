import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  if (!socket) {
    const url = import.meta.env.PROD
      ? window.location.origin
      : `http://${window.location.hostname}:3001`;
    socket = io(url, { auth: { token } });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
