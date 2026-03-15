import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useAuth } from "@/context/AuthContext";

const SocketContext = createContext({ socket: null, connected: false });

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [instance, setInstance] = useState(null);

  useEffect(() => {
    if (!user) {
      const existing = getSocket();
      if (existing) {
        disconnectSocket();
      }
      setInstance(null);
      setConnected(false);
      return;
    }

    const socket = connectSocket(localStorage.getItem("token") || "");
    setInstance(socket);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: instance, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  return useContext(SocketContext);
}

