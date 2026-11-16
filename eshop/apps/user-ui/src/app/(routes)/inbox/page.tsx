"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import useRequireAuth from "apps/user-ui/src/hooks/useRequiredAuth";
import Link from "next/link";
import axiosInstance from "apps/user-ui/src/utils/axiosInstance";
import { isProtected } from "apps/user-ui/src/utils/protected";
import ChatInput from "apps/user-ui/src/shared/components/chats/chatinput";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { useWebSocket } from "apps/user-ui/src/context/web-socket-context";

const InboxContent = () => {
    const searchParams = useSearchParams();
    useRequireAuth();
    const router = useRouter();

    const messageContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

    const queryClient = useQueryClient();

    const [chats, setChats] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [message, setMessage] = useState("");
    const [sendError, setSendError] = useState("");
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const { ws, presence = {}, unreadCounts = {} } = useWebSocket() ?? {};

    const conversationId = searchParams.get("conversationId");

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 0);
        });
    };

    const sendToSocket = (data: any) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    };

    const { data: messages = [] } = useQuery({
        queryKey: ["messages", conversationId],
        queryFn: async () => {
            const res = await axiosInstance.get(
                `/chatting/api/get-messages/${conversationId}?page=1`,
                isProtected
            );
            setPage(1);
            setHasMore(res.data.hasMore);
            return res.data.messages.reverse();
        },
        enabled: !!conversationId,
        staleTime: 0,
        refetchInterval: conversationId ? 2_000 : 10_000,
    });

    const loadMoreMessages = async () => {
        const nextPage = page + 1;
        const res = await axiosInstance.get(
            `/chatting/api/get-messages/${conversationId}?page=${nextPage}`,
            isProtected
        );

        queryClient.setQueryData(["messages", conversationId], (old: any = []) => [
            ...res.data.messages.reverse(),
            ...old,
        ]);

        setPage(nextPage);
        setHasMore(res.data.hasMore);
    };

    const { data: conversations, isLoading } = useQuery({
        queryKey: ["conversations"],
        queryFn: async () => {
            const res = await axiosInstance.get(
                "/chatting/api/get-user-conversations",
                isProtected
            );
            return res.data.conversations;
        },
        refetchOnMount: "always",
        refetchInterval: 30_000,
    });

    useEffect(() => {
        if (conversations) {
            setChats((previous) => conversations.map((chat: any) => ({
                ...chat,
                seller: {
                    ...chat.seller,
                    isOnline: presence[`seller_${chat.seller?.id}`]?.isOnline ?? chat.seller?.isOnline,
                    lastSeenAt: presence[`seller_${chat.seller?.id}`]?.lastSeenAt ?? chat.seller?.lastSeenAt,
                },
                unreadCount: unreadCounts[chat.conversationId] ?? chat.unreadCount,
            })));
        }
    }, [conversations, presence, unreadCounts]);

    useEffect(() => {
        if (conversationId && chats.length > 0) {
            const chat = chats.find((c) => c.conversationId === conversationId);

            setSelectedChat(chat || null);
        }
    }, [conversationId, chats]);

    // keep the latest message in view
    useEffect(() => {
        if (messages?.length > 0) scrollToBottom();
    }, [messages]);

    // receive new messages from the seller in real time
    useEffect(() => {
        if (!ws) return;

        const handleIncoming = (event: MessageEvent) => {
            let data: any;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }
            if (data.type !== "NEW_MESSAGE") return;

            const msg = data.payload;
            // our own messages are already added in handleSend (the server echoes them back)
            if (msg.senderType === "user") return;

            // only append when that conversation's history is already loaded
            queryClient.setQueryData(["messages", msg.conversationId], (old: any[] = []) =>
                old.some((item) => item.id === msg.id) ? old : [...old, msg]
            );

            setChats((prev) =>
                prev.map((c) =>
                    c.conversationId === msg.conversationId
                        ? { ...c, lastMessage: msg.content, lastMessageAt: msg.createdAt }
                        : c
                )
            );

            if (msg.conversationId === conversationId) {
                sendToSocket({
                    type: "MARK_AS_SEEN",
                    conversationId: msg.conversationId,
                });
            }
        };

        ws.addEventListener("message", handleIncoming);
        return () => ws.removeEventListener("message", handleIncoming);
    }, [ws, queryClient, conversationId, presence]);

    const handleChatSelect = (chat: any) => {
        setChats((prev) =>
            prev.map((c) =>
                c.conversationId === chat.conversationId ? { ...c, unreadCount: 0 } : c
            )
        );
        router.push(`?conversationId=${chat.conversationId}`);

        sendToSocket({
            type: "MARK_AS_SEEN",
            conversationId: chat.conversationId,
        });
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
            }, isProtected);
            const sentMessage = response.data.message;

            queryClient.setQueryData(
                ["messages", selectedChat.conversationId],
                (old: any = []) => [...old, sentMessage]
            );
            setChats((prevChats) =>
                prevChats.map((chat) =>
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

    const getLastMessage = (chat: any) => chat?.lastMessage || "";

    return (
        <div className="w-full">
            <div className="md:w-[80%] mx-auto pt-5">
                <div className="flex h-[80vh] shadow-sm overflow-hidden">
                    {/* Conversations Sidebar */}
                    <div className="w-[320px] border-r border-r-gray-200 bg-gray-50">
                        <div className="p-4 border-b border-b-gray-200 text-lg font-semibold text-gray-800">
                            Messages
                        </div>

                        <div className="divide-y divide-gray-200">
                            {isLoading ? (
                                <div className="p-4 text-sm text-gray-500">Loading...</div>
                            ) : chats.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500">
                                    No Conversation
                                </div>
                            ) : (
                                chats.map((chat) => {
                                    const isActive =
                                        selectedChat?.conversationId === chat.conversationId;

                                    return (
                                        <button
                                            key={chat.conversationId}
                                            onClick={() => handleChatSelect(chat)}
                                            className={`w-full text-left px-4 py-3 transition hover:bg-blue-50 ${isActive ? "bg-blue-100" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={
                                                        chat.seller?.avatar ||
                                                        "/default-avatar.png"
                                                    }
                                                    alt={chat.seller?.name || "Seller"}
                                                    width={40}
                                                    height={40}
                                                    className="rounded-full border w-[40px] h-[40px] object-cover"
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-800 font-semibold truncate">
                                                            {chat.seller?.name}
                                                        </span>

                                                        {chat.seller?.isOnline && (
                                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-gray-500 truncate max-w-[170px]">
                                                        {chat.productContext?.title
                                                            ? `Product: ${chat.productContext.title}`
                                                            : getLastMessage(chat)}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 bg-gray-100 flex flex-col">
                        {selectedChat ? (
                            <>
                                {/* Chat header */}
                                <div className="p-4 border-b border-b-gray-200 bg-white flex items-center gap-3">
                                    <img
                                        src={
                                            selectedChat.seller?.avatar ||
                                            "/default-avatar.png"
                                        }
                                        alt={selectedChat.seller?.name || "Seller"}
                                        width={40}
                                        height={40}
                                        className="rounded-full border w-[40px] h-[40px] object-cover border-gray-200"
                                    />
                                    <div>
                                        <h2 className="text-gray-800 font-semibold text-base">
                                            {selectedChat.seller?.name}
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            {selectedChat.seller?.isOnline
                                                ? "Online"
                                                : selectedChat.seller?.lastSeenAt
                                                    ? `Last seen ${new Date(selectedChat.seller.lastSeenAt).toLocaleString()}`
                                                    : "Offline"}
                                        </p>
                                    </div>
                                </div>
                                {selectedChat.productContext && (
                                    <Link
                                        href={`/product/${selectedChat.productContext.slug}`}
                                        className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 p-3 hover:bg-blue-100"
                                    >
                                        {selectedChat.productContext.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={selectedChat.productContext.imageUrl}
                                                alt={selectedChat.productContext.title}
                                                className="h-16 w-16 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="h-16 w-16 rounded-lg bg-blue-100" />
                                        )}
                                        <span className="min-w-0">
                                            <span className="block text-xs font-medium uppercase tracking-wide text-blue-700">
                                                Product inquiry
                                            </span>
                                            <span className="block truncate font-semibold text-slate-900">
                                                {selectedChat.productContext.title}
                                            </span>
                                            <span className="text-sm text-slate-600">
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
                                    {hasMore && (
                                        <div className="flex justify-center mb-2">
                                            <button
                                                onClick={loadMoreMessages}
                                                className="text-xs px-4 py-1 bg-gray-200 hover:bg-gray-300"
                                            >
                                                Load previous messages
                                            </button>
                                        </div>
                                    )}

                                    {messages?.map((msg: any, index: number) => (
                                        <div
                                            key={index}
                                            className={`flex flex-col ${msg.senderType === "user"
                                                    ? "items-end ml-auto"
                                                    : "items-start"
                                                } max-w-[80%]`}
                                        >
                                            <div
                                                className={`${msg.senderType === "user"
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-gray-800"
                                                    } px-4 py-2 rounded-lg shadow-sm w-fit`}
                                            >
                                                {msg.text || msg.content}
                                            </div>
                                            <div
                                                className={`text-[11px] text-gray-400 mt-1 flex items-center gap-1 ${msg.senderType === "user"
                                                        ? "mr-1 justify-end"
                                                        : "ml-1"
                                                    }`}
                                            >
                                                {msg.time ||
                                                    new Date(msg.createdAt).toLocaleTimeString(
                                                        [],
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }
                                                    )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={scrollAnchorRef} />
                                </div>

                                {sendError && (
                                    <p className="px-4 pb-2 text-sm text-red-600" role="alert">
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
                            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                Select a conversation to start messaging
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// useSearchParams needs a Suspense boundary or `next build` fails
const Page = () => (
    <Suspense fallback={null}>
        <InboxContent />
    </Suspense>
);

export default Page;