// frontend/src/socket.ts (FRONTEND)

import { io } from "socket.io-client";

const rawApiUrl =
  import.meta.env.VITE_API_URL || "https://macrobox-backend.onrender.com/api";

/*
  Socket.IO must connect to backend root URL, not /api.
  Example:
  VITE_API_URL=https://macrobox-backend.onrender.com/api
  SOCKET_BASE=https://macrobox-backend.onrender.com
*/
const SOCKET_BASE = String(rawApiUrl)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const socket = io(SOCKET_BASE, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: true,
});

export default socket;