"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";

const WebSocketContext = createContext<any>(null);

export const WebSocketProvider = ({
    children,
    user,
}: {
    children: ReactNode;
    user: any;
}) => {
    const [wsReady, setWsReady] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [presence, setPresence] = useState<Record<string, { isOnline: boolean; lastSeenAt: string | null }>>({});

    useEffect(() => {
        if (!user?.id) return;

        const socketUrl = process.env.NEXT_PUBLIC_CHATTING_WEBSOCKET_URI;

        let active = true;
        let socket: WebSocket | null = null;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let reconnect: ReturnType<typeof setTimeout> | undefined;

        const connect = async () => {
            if (!active) return;
            try {
                const { data } = await axiosInstance.post("/chatting/api/socket-ticket");
                if (!active) return;
                let resolvedUrl = socketUrl;
                if (!resolvedUrl) {
                    const serverUrl = new URL(process.env.NEXT_PUBLIC_SERVER_URI as string);
                    serverUrl.protocol = serverUrl.protocol === "https:" ? "wss:" : "ws:";
                    serverUrl.port = "6006";
                    serverUrl.pathname = "";
                    resolvedUrl = serverUrl.toString();
                }
                socket = new WebSocket(resolvedUrl, ["chat-auth", `ticket.${data.token}`]);
                setWs(socket);

                socket.onopen = () => {
                    setWsReady(true);
                    heartbeat = setInterval(() => {
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({ type: "HEARTBEAT" }));
                        }
                    }, 25_000);
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === "UNSEEN_COUNT_UPDATE") {
                            const { conversationId, count } = data.payload;
                            setUnreadCounts((prev) => ({ ...prev, [conversationId]: count }));
                        } else if (data.type === "PRESENCE_UPDATE") {
                            const { role, id, isOnline, lastSeenAt } = data.payload;
                            setPresence((prev) => ({
                                ...prev,
                                [`${role}_${id}`]: { isOnline, lastSeenAt: lastSeenAt ?? null },
                            }));
                        }
                    } catch (error) {
                        console.error("Invalid chat WebSocket event:", error);
                    }
                };

                socket.onerror = (error) => {
                    console.error("Chat WebSocket connection failed:", error);
                    socket?.close();
                };

                socket.onclose = () => {
                    if (heartbeat) clearInterval(heartbeat);
                    setWs(null);
                    setWsReady(true);
                    if (active) reconnect = setTimeout(() => void connect(), 5_000);
                };
            } catch (error) {
                console.error("Could not establish chat connection:", error);
                setWsReady(true);
                if (active) reconnect = setTimeout(() => void connect(), 5_000);
            }
        };
        void connect();

        return () => {
            active = false;
            if (reconnect) clearTimeout(reconnect);
            if (heartbeat) clearInterval(heartbeat);
            socket?.close();
            setWs(null);
            setWsReady(false);
        };
    }, [user?.id]);

    if (!wsReady) return null;

    return (
        <WebSocketContext.Provider value={{ ws, unreadCounts, presence }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);