import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) return socket;

  socket = io(import.meta.env.VITE_BACKEND_WS_URL || "http://localhost:5000", {
    transports: ["websocket"],
    autoConnect: true,
    auth: { token },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

