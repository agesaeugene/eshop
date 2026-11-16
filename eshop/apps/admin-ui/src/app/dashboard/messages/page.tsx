"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import useAdmin from "apps/admin-ui/src/hooks/useAdmin";
import axiosInstance from "apps/admin-ui/src/app/utils/axiosinstance";

const MessagesContent = () => {
    const { admin } = useAdmin();
    const router = useRouter();
    const searchParams = useSearchParams();
    const conversationId = searchParams.get("conversationId");
    const queryClient = useQueryClient();
    const messagesRef = useRef<HTMLDivElement | null>(null);
    const [message, setMessage] = useState("");
    const [sendError, setSendError] = useState("");
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [presence, setPresence] = useState<Record<string, { isOnline: boolean; lastSeenAt: string | null }>>({});

    const { data: conversations = [] } = useQuery({
        queryKey: ["admin-chat-conversations"],
        queryFn: async () => {
            const response = await axiosInstance.get("/chatting/api/get-admin-conversations");
            return response.data.conversations;
        },
        refetchInterval: 30_000,
    });

    const { data: messages = [] } = useQuery({
        queryKey: ["admin-chat-messages", conversationId],
        queryFn: async () => {
            const response = await axiosInstance.get(
                `/chatting/api/get-admin-messages/${conversationId}?page=1`
            );
            return response.data.messages.reverse();
        },
        enabled: !!conversationId,
        staleTime: 0,
        refetchInterval: conversationId ? 2_000 : 10_000,
    });

    const selectedConversation = conversations.find(
        (conversation: any) => conversation.conversationId === conversationId
    );

    useEffect(() => {
        if (!admin?.id) return;
        const socketUrl = process.env.NEXT_PUBLIC_CHATTING_WEBSOCKET_URI;

        let active = true;
        let connection: WebSocket | null = null;
        let heartbeat: ReturnType<typeof setInterval> | undefined;
        let reconnect: ReturnType<typeof setTimeout> | undefined;

        const connect = async () => {
            if (!active) return;
            try {
                const { data } = await axiosInstance.post("/chatting/api/admin/socket-ticket");
                if (!active) return;
                let resolvedUrl = socketUrl;
                if (!resolvedUrl) {
                    const serverUrl = new URL(process.env.NEXT_PUBLIC_SERVER_URI as string);
                    serverUrl.protocol = serverUrl.protocol === "https:" ? "wss:" : "ws:";
                    serverUrl.port = "6006";
                    serverUrl.pathname = "";
                    resolvedUrl = serverUrl.toString();
                }
                connection = new WebSocket(resolvedUrl, ["chat-auth", `ticket.${data.token}`]);
                setSocket(connection);
                connection.onopen = () => {
                    heartbeat = setInterval(() => {
                        if (connection?.readyState === WebSocket.OPEN) {
                            connection.send(JSON.stringify({ type: "HEARTBEAT" }));
                        }
                    }, 25_000);
                };
                connection.onerror = (error) => {
                    console.error("Admin chat connection failed:", error);
                    connection?.close();
                };
                connection.onclose = () => {
                    if (heartbeat) clearInterval(heartbeat);
                    setSocket(null);
                    if (active) reconnect = setTimeout(() => void connect(), 5_000);
                };
            } catch (error) {
                console.error("Could not establish admin chat connection:", error);
                if (active) reconnect = setTimeout(() => void connect(), 5_000);
            }
        };
        void connect();

        return () => {
            active = false;
            if (reconnect) clearTimeout(reconnect);
            if (heartbeat) clearInterval(heartbeat);
            connection?.close();
            setSocket(null);
        };
    }, [admin?.id]);

    useEffect(() => {
        if (!socket) return;
        const handleIncoming = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "PRESENCE_UPDATE") {
                    const { role, id, isOnline, lastSeenAt } = data.payload;
                    setPresence((current) => ({
                        ...current,
                        [`${role}_${id}`]: { isOnline, lastSeenAt: lastSeenAt ?? null },
                    }));
                    queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
                    return;
                }
                if (data.type === "UNSEEN_COUNT_UPDATE") {
                    queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
                    return;
                }
                if (data.type !== "NEW_MESSAGE" || !data.payload) return;
                const newMessage = data.payload;
                if (newMessage.senderType === "admin") return;

                queryClient.setQueryData(
                    ["admin-chat-messages", newMessage.conversationId],
                    (old: any[] = []) => old.some((item) => item.id === newMessage.id)
                        ? old
                        : [...old, newMessage]
                );
                queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
                if (newMessage.conversationId === conversationId) {
                    socket.send(JSON.stringify({
                        type: "MARK_AS_SEEN",
                        conversationId: newMessage.conversationId,
                    }));
                }
            } catch (error) {
                console.error("Invalid chat WebSocket event:", error);
            }
        };

        socket.addEventListener("message", handleIncoming);
        return () => socket.removeEventListener("message", handleIncoming);
    }, [socket, conversationId, queryClient]);

    useEffect(() => {
        messagesRef.current?.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    const selectConversation = (id: string) => {
        router.push(`?conversationId=${id}`);
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "MARK_AS_SEEN", conversationId: id }));
        }
    };

    const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!conversationId || !message.trim()) return;

        setSendError("");
        try {
            const response = await axiosInstance.post("/chatting/api/admin-send-message", {
                conversationId,
                content: message.trim(),
            });
            queryClient.setQueryData(
                ["admin-chat-messages", conversationId],
                (old: any = []) => [...old, response.data.message]
            );
            queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
            setMessage("");
        } catch (error) {
            console.error("Could not send admin chat message:", error);
            setSendError("Your message could not be sent. Please try again.");
        }
    };

    return (
        <main className="p-6 text-white">
            <h1 className="mb-5 text-2xl font-semibold">Seller messages</h1>
            <div className="flex h-[calc(100vh-140px)] min-h-[480px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-700">
                    {conversations.length === 0 ? (
                        <p className="p-4 text-sm text-slate-400">No seller conversations yet.</p>
                    ) : conversations.map((conversation: any) => (
                        <button
                            key={conversation.conversationId}
                            onClick={() => selectConversation(conversation.conversationId)}
                            className={`w-full border-b border-slate-800 p-4 text-left hover:bg-slate-900 ${
                                conversationId === conversation.conversationId ? "bg-slate-900" : ""
                            }`}
                        >
                            <span className="flex items-center justify-between gap-2 font-medium">
                                <span className="truncate">{conversation.seller.name}</span>
                                {(presence[`seller_${conversation.seller.id}`]?.isOnline ?? conversation.seller.isOnline) && (
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                                )}
                            </span>
                            <span className="block text-xs text-slate-500">
                                {(presence[`seller_${conversation.seller.id}`]?.isOnline ?? conversation.seller.isOnline)
                                    ? "Online"
                                    : (presence[`seller_${conversation.seller.id}`]?.lastSeenAt ?? conversation.seller.lastSeenAt)
                                        ? `Last seen ${new Date(presence[`seller_${conversation.seller.id}`]?.lastSeenAt ?? conversation.seller.lastSeenAt).toLocaleString()}`
                                        : "Offline"}
                            </span>
                            <span className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                                <span className="truncate">{conversation.lastMessage}</span>
                                {conversation.unreadCount > 0 && (
                                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-white">
                                        {conversation.unreadCount}
                                    </span>
                                )}
                            </span>
                        </button>
                    ))}
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    {selectedConversation ? (
                        <>
                            <header className="border-b border-slate-700 bg-slate-900 px-5 py-4">
                                <h2 className="font-semibold">{selectedConversation.seller.name}</h2>
                                <p className="text-xs text-slate-400">
                                    {(presence[`seller_${selectedConversation.seller.id}`]?.isOnline ?? selectedConversation.seller.isOnline)
                                        ? "Online"
                                        : (presence[`seller_${selectedConversation.seller.id}`]?.lastSeenAt ?? selectedConversation.seller.lastSeenAt)
                                            ? `Last seen ${new Date(presence[`seller_${selectedConversation.seller.id}`]?.lastSeenAt ?? selectedConversation.seller.lastSeenAt).toLocaleString()}`
                                            : "Offline"}
                                </p>
                            </header>
                            {selectedConversation.productContext && (
                                <a
                                    href={`${process.env.NEXT_PUBLIC_USER_UI_URI || "http://localhost:3000"}/product/${selectedConversation.productContext.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 border-b border-blue-900 bg-blue-950/50 p-3 hover:bg-blue-900/50"
                                >
                                    {selectedConversation.productContext.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={selectedConversation.productContext.imageUrl}
                                            alt={selectedConversation.productContext.title}
                                            className="h-14 w-14 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="h-14 w-14 rounded-lg bg-slate-800" />
                                    )}
                                    <span>
                                        <span className="block text-xs font-medium uppercase tracking-wide text-blue-300">Product inquiry</span>
                                        <span className="block font-semibold">{selectedConversation.productContext.title}</span>
                                        <span className="text-sm text-slate-300">KES {Number(selectedConversation.productContext.price).toLocaleString()}</span>
                                    </span>
                                </a>
                            )}
                            <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto p-5">
                                {messages.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className={`flex ${item.senderType === "admin" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div className={`max-w-[75%] rounded-lg px-4 py-2 ${
                                            item.senderType === "admin"
                                                ? "bg-blue-600 text-white"
                                                : "bg-slate-800 text-slate-100"
                                        }`}>
                                            <p className="break-words">{item.content}</p>
                                            <p className="mt-1 text-right text-[11px] opacity-70">
                                                {new Date(item.createdAt).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {sendError && <p className="px-4 pb-2 text-sm text-red-400" role="alert">{sendError}</p>}
                            <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-700 p-3">
                                <input
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Write a reply..."
                                    className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!message.trim()}
                                    aria-label="Send message"
                                    className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                            Select a seller conversation to reply.
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
};

const Page = () => (
    <Suspense fallback={null}>
        <MessagesContent />
    </Suspense>
);

export default Page;
