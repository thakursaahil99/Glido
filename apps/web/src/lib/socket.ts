import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    socket = io(`${url}/realtime`, {
      transports: ["websocket"],
      autoConnect: true,
      // A function (not a static object) so the *current* token is read on every
      // (re)connect attempt — the server now requires it and disconnects sockets
      // that don't present one, so this must always be fresh, not just the value
      // at first getSocket() call (e.g. before login).
      auth: (cb) => cb({ token: localStorage.getItem("glido_access_token") }),
    });
  }
  return socket;
}
