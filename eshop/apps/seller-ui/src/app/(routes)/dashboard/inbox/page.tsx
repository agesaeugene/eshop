"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ChatInput from "apps/seller-ui/src/shared/components/chats/chatinput";
import { useWebSocket } from "apps/seller-ui/src/context/web-socket-context";
import axiosInstance from "apps/seller-ui/src/utils/axiosInstance";

const ChatPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const messageContainerRef = useRef<HTMLDivElement | null>(null);
    const conversationId = searchParams.get("conversationId");
    const queryClient = useQueryClient();

    const { ws, presence = {}, unreadCounts = {} } = useWebSocket() ?? {};

    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [message, setMessage] = useState("");
    const [sendError, setSendError] = useState("");

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                const container = messageContainerRef.current;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 50);
        });
    };

    // messages of the selected conversation
    const { data: messages = [] } = useQuery({
        queryKey: ["messages", conversationId],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/chatting/api/get-seller-messages/${conversationId}?page=1`
            );
            return res.data.messages.reverse();
        },
        enabled: !!conversationId,
        staleTime: 0,
        refetchInterval: conversationId ? 2_000 : 10_000,
    });

    // all conversations of this seller
    const { data: conversations, isLoading } = useQuery({
        queryKey: ["conversations"],
        queryFn: async () => {
            const res = await axiosInstance.get(
                "/chatting/api/get-seller-conversations"
            );
            return res.data.conversations;
        },
        refetchInterval: 30_000,
    });

    const { data: availableAdmins = [] } = useQuery({
        queryKey: ["chat-admins"],
        queryFn: async () => {
            const res = await axiosInstance.get("/chatting/api/get-admins");
            return res.data.admins;
        },
        refetchInterval: 30_000,
    });
    const admins = availableAdmins.map((admin: any) => ({
        ...admin,
        isOnline: presence[`admin_${admin.id}`]?.isOnline ?? admin.isOnline,
        lastSeenAt: presence[`admin_${admin.id}`]?.lastSeenAt ?? admin.lastSeenAt,
    }));

    useEffect(() => {
        if (conversations) {
            setChats(conversations.map((chat: any) => ({
                ...chat,
                user: {
                    ...chat.user,
                    isOnline: presence[`${chat.user?.isAdmin ? "admin" : "user"}_${chat.user?.id}`]?.isOnline
                        ?? chat.user?.isOnline,
                    lastSeenAt: presence[`${chat.user?.isAdmin ? "admin" : "user"}_${chat.user?.id}`]?.lastSeenAt
                        ?? chat.user?.lastSeenAt,
                },
                unreadCount: unreadCounts[chat.conversationId] ?? chat.unreadCount,
            })));
        }
    }, [conversations, presence, unreadCounts]);

    // select the chat that matches the conversationId in the URL
    useEffect(() => {
        if (conversationId && chats.length > 0) {
            const chat = chats.find((c) => c.conversationId === conversationId);
            setSelectedChat(chat || null);
        }
    }, [conversationId, chats]);

    // keep the latest message in view
    useEffect(() => {
        if (!conversationId || messages.length === 0) return;
        const timeout = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeout);
    }, [conversationId, messages.length]);

    // real-time messages
    useEffect(() => {
        if (!ws) return;

        const handleIncoming = (event: MessageEvent) => {
            let data: any;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }

            if (data.type === "NEW_MESSAGE") {
                const newMsg = data?.payload;
                if (!newMsg || newMsg.senderType === "seller") return;

                const content = newMsg.content || "";

                if (newMsg.conversationId === conversationId) {
                    queryClient.setQueryData(
                        ["messages", conversationId],
                        (old: any[] = []) => old.some((item) => item.id === newMsg.id)
                            ? old
                            : [...old, newMsg]
                    );
                    scrollToBottom();
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: "MARK_AS_SEEN",
                            conversationId: newMsg.conversationId,
                        }));
                    }
                }

                setChats((prevChats) =>
                    prevChats.map((chat) =>
                        chat.conversationId === newMsg.conversationId
                            ? { ...chat, lastMessage: content, lastMessageAt: newMsg.createdAt }
                            : chat
                    )
                );
            }
        };

        ws.addEventListener("message", handleIncoming);
        return () => ws.removeEventListener("message", handleIncoming);
    }, [ws, conversationId, queryClient, presence]);

    const handleChatSelect = (chat: any) => {
        setChats((prev) =>
            prev.map((c) =>
                c.conversationId === chat.conversationId ? { ...c, unreadCount: 0 } : c
            )
        );
        router.push(`?conversationId=${chat.conversationId}`);

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    type: "MARK_AS_SEEN",
                    conversationId: chat.conversationId,
                })
            );
        }
    };

    const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!message.trim() || !selectedChat) return;

        const content = message.trim();
        setSendError("");
        try {
            const response = await axiosInstance.post("/chatting/api/send-message", {
                conversationId: selectedChat.conversationId,
                content,
            });
            const sentMessage = response.data.message;

            queryClient.setQueryData(
                ["messages", selectedChat.conversationId],
                (old: any = []) => [...old, sentMessage]
            );
            setChats((prev) =>
                prev.map((chat) =>
                    chat.conversationId === selectedChat.conversationId
                        ? {
                            ...chat,
                            lastMessage: sentMessage.content,
                            lastMessageAt: sentMessage.createdAt,
                        }
                        : chat
                )
            );
            setMessage("");
            scrollToBottom();
        } catch (error) {
            console.error("Could not send chat message:", error);
            setSendError("Your message could not be sent. Please try again.");
        }
    };

    const handleAdminSelect = async (admin: any) => {
        setSendError("");
        try {
            const response = await axiosInstance.post(
                "/chatting/api/create-admin-conversation",
                { adminId: admin.id }
            );
            await queryClient.invalidateQueries({ queryKey: ["conversations"] });
            router.push(`?conversationId=${response.data.conversation.id}`);
        } catch (error) {
            console.error("Could not start admin conversation:", error);
            const response = (error as any)?.response;
            setSendError(
                response?.data?.message
                    ? `Could not open admin chat: ${response.data.message}`
                    : `Could not open admin chat${response?.status ? ` (${response.status})` : ""}. Please try again.`
            );
        }
    };

    return (
        <div className="w-full">
            <div className="flex h-screen shadow-inner overflow-hidden bg-gray-950 text-gray-200">
                {/* Sidebar */}
                <div className="w-[320px] border-r border-gray-800 bg-gray-950">
                    <div className="p-4 border-b border-gray-800 text-lg font-semibold">
                        Messages
                    </div>

                    <div className="divide-y divide-gray-900">
                        <div className="p-3 border-b border-gray-800">
                            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Contact an admin
                            </p>
                            {admins.map((admin: any) => (
                                <button
                                    key={admin.id}
                                    onClick={() => handleAdminSelect(admin)}
                                    className="w-full flex items-center gap-3 rounded px-2 py-2 text-left hover:bg-gray-800"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={admin.avatar?.url || "/default-avatar.png"}
                                        alt={admin.name}
                                        className="h-9 w-9 rounded-full border border-gray-700 object-cover"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm text-white">
                                        {admin.name}
                                        <span className="block text-xs text-gray-400">
                                            {admin.isOnline
                                                ? "Online"
                                                : admin.lastSeenAt
                                                    ? `Last seen ${new Date(admin.lastSeenAt).toLocaleString()}`
                                                    : "Admin support"}
                                        </span>
                                    </span>
                                    {admin.isOnline && <span className="h-2 w-2 rounded-full bg-green-500" />}
                                </button>
                            ))}
                        </div>

                        {isLoading ? (
                            <div className="text-center py-5 text-sm">Loading...</div>
                        ) : chats.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">
                                No conversation available yet!
                            </p>
                        ) : (
                            chats.map((chat) => {
                                const isActive =
                                    selectedChat?.conversationId === chat.conversationId;

                                return (
                                    <button
                                        key={chat.conversationId}
                                        onClick={() => handleChatSelect(chat)}
                                        className={`w-full text-left px-4 py-3 transition ${
                                            isActive ? "bg-blue-950" : "hover:bg-gray-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={chat.user?.avatar || "/default-avatar.png"}
                                                alt={chat.user?.name || "User"}
                                                width={40}
                                                height={40}
                                                className="rounded-full border border-gray-700 w-[40px] h-[40px] object-cover"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-white truncate">
                                                        {chat.user?.isAdmin ? "Admin · " : ""}
                                                        {chat.user?.name}
                                                    </span>
                                                    {chat.user?.isOnline && (
                                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-400 truncate max-w-[170px]">
                                                        {chat.productContext?.title
                                                            ? `Product: ${chat.productContext.title}`
                                                            : chat.lastMessage || ""}
                                                    </p>
                                                    {chat?.unreadCount > 0 && (
                                                        <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                                                            {chat.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat content */}
                <div className="flex flex-col flex-1 bg-gray-950">
                    {selectedChat ? (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedChat.user?.avatar || "/default-avatar.png"}
                                    alt={selectedChat.user?.name || "User"}
                                    width={40}
                                    height={40}
                                    className="rounded-full border border-gray-700 w-[40px] h-[40px] object-cover"
                                />
                                <div>
                                    <h2 className="text-white font-semibold text-base">
                                        {selectedChat.user?.isAdmin ? "Admin · " : ""}
                                        {selectedChat.user?.name}
                                    </h2>
                                    <p className="text-xs text-gray-400">
                                        {selectedChat.user?.isOnline
                                            ? "Online"
                                            : selectedChat.user?.lastSeenAt
                                                ? `Last seen ${new Date(selectedChat.user.lastSeenAt).toLocaleString()}`
                                                : "Offline"}
                                    </p>
                                </div>
                            </div>
                            {selectedChat.productContext && (
                                <Link
                                    href={`/product/${selectedChat.productContext.slug}`}
                                    className="flex items-center gap-3 border-b border-blue-900 bg-blue-950/60 p-3 hover:bg-blue-900/60"
                                >
                                    {selectedChat.productContext.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={selectedChat.productContext.imageUrl}
                                            alt={selectedChat.productContext.title}
                                            className="h-16 w-16 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="h-16 w-16 rounded-lg bg-slate-800" />
                                    )}
                                    <span className="min-w-0">
                                        <span className="block text-xs font-medium uppercase tracking-wide text-blue-300">
                                            Customer is asking about
                                        </span>
                                        <span className="block truncate font-semibold text-white">
                                            {selectedChat.productContext.title}
                                        </span>
                                        <span className="text-sm text-slate-300">
                                            KES {Number(selectedChat.productContext.price).toLocaleString()}
                                        </span>
                                    </span>
                                </Link>
                            )}

                            {/* Messages */}
                            <div
                                ref={messageContainerRef}
                                className="flex-1 overflow-y-auto px-6 py-6 space-y-4 text-sm"
                            >
                                {messages.map((msg: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`flex flex-col ${
                                            msg.senderType === "seller"
                                                ? "items-end ml-auto"
                                                : "items-start"
                                        } max-w-[80%]`}
                                    >
                                        <div
                                            className={`${
                                                msg.senderType === "seller"
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-800 text-gray-200"
                                            } px-4 py-2 rounded-lg shadow-sm w-fit`}
                                        >
                                            {msg.content}
                                        </div>

                                        <div
                                            className={`text-[11px] text-gray-400 mt-1 flex items-center gap-1 ${
                                                msg.senderType === "seller"
                                                    ? "mr-1 justify-end"
                                                    : "ml-1"
                                            }`}
                                        >
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            {sendError && (
                                <p className="px-4 pb-2 text-sm text-red-400" role="alert">
                                    {sendError}
                                </p>
                            )}
                            <ChatInput
                                message={message}
                                setMessage={setMessage}
                                onSendMessage={handleSend}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Select a conversation to start chatting
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;