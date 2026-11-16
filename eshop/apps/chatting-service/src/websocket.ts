import prisma from "@packages/libs/prisma";
import redis from "@packages/libs/redis";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";

type ChatRole = "user" | "seller" | "admin";

type ChatRecipient = {
    role: ChatRole;
    id: string;
};

type ChatMessagePayload = {
    id: string;
    conversationId: string;
    senderId: string;
    senderType: string;
    content: string;
    attachments: string[];
    status: string;
    createdAt: Date;
};

const connectedUsers = new Map<string, Set<WebSocket>>();
const connectionIdentity = new WeakMap<WebSocket, ChatRecipient>();

const identityKey = ({ role, id }: ChatRecipient) => `${role}_${id}`;
const onlineKey = ({ role, id }: ChatRecipient) => `online:${role}:${id}`;
const lastSeenKey = ({ role, id }: ChatRecipient) => `last-seen:${role}:${id}`;

const updateParticipantPresence = async (identity: ChatRecipient, isOnline: boolean, lastSeenAt: Date) => {
    const identityWhere = identity.role === "seller"
        ? { sellerId: identity.id }
        : { userId: identity.id };
    await prisma.participant.updateMany({
        where: identityWhere,
        data: { isOnline, ...(!isOnline ? { lastSeenAt } : {}) },
    });
};

const notifyConversationPeers = async (
    identity: ChatRecipient,
    isOnline: boolean,
    lastSeenAt: Date
) => {
    const identityWhere = identity.role === "seller"
        ? { sellerId: identity.id }
        : { userId: identity.id };
    const memberships = await prisma.participant.findMany({ where: identityWhere });

    for (const membership of memberships) {
        const peers = await prisma.participant.findMany({
            where: {
                conversationId: membership.conversationId,
                id: { not: membership.id },
            },
        });

        for (const peer of peers) {
            let recipient: ChatRecipient | null = null;
            if (peer.sellerId) {
                recipient = { role: "seller", id: peer.sellerId };
            } else if (peer.userId) {
                const user = await prisma.users.findUnique({
                    where: { id: peer.userId },
                    select: { role: true },
                });
                recipient = {
                    role: user?.role === "admin" ? "admin" : "user",
                    id: peer.userId,
                };
            }
            if (!recipient) continue;

            const presence = JSON.stringify({
                type: "PRESENCE_UPDATE",
                payload: {
                    role: identity.role,
                    id: identity.id,
                    isOnline,
                    lastSeenAt: lastSeenAt.toISOString(),
                },
            });
            for (const socket of connectedUsers.get(identityKey(recipient)) ?? []) {
                if (socket.readyState === WebSocket.OPEN) socket.send(presence);
            }
        }
    }
};

const authenticateSocket = async (protocols: string): Promise<ChatRecipient | null> => {
    const ticket = protocols.split(",")
        .map((protocol) => protocol.trim())
        .find((protocol) => protocol.startsWith("ticket."));
    if (!ticket) return null;

    let decoded: { id?: string; role?: string; chatSocket?: boolean };
    try {
        decoded = jwt.verify(
            ticket.slice("ticket.".length),
            process.env.ACCESS_TOKEN_SECRET as string,
            { algorithms: ["HS256"] }
        ) as { id?: string; role?: string; chatSocket?: boolean };
    } catch {
        return null;
    }
    if (
        !decoded.id ||
        decoded.chatSocket !== true ||
        !["user", "seller", "admin"].includes(decoded.role || "")
    ) return null;

    const role = decoded.role as ChatRole;
    if (role === "seller") {
        const seller = await prisma.sellers.findUnique({
            where: { id: decoded.id },
            select: { id: true },
        });
        return seller ? { role, id: seller.id } : null;
    }

    const user = await prisma.users.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true },
    });
    if (!user || (role === "admin" && user.role !== "admin")) return null;
    if (role === "user" && user.role === "admin") return null;
    return { role, id: user.id };
};

export async function publishChatMessage(
    message: ChatMessagePayload,
    sender: ChatRecipient,
    receiver: ChatRecipient,
    unreadCount: number
) {
    const event = JSON.stringify({ type: "NEW_MESSAGE", payload: message });

    for (const recipient of [sender, receiver]) {
        const sockets = connectedUsers.get(identityKey(recipient));
        if (!sockets) continue;

        for (const socket of sockets) {
            if (socket.readyState !== WebSocket.OPEN) continue;

            socket.send(event);
            if (recipient.role === receiver.role && recipient.id === receiver.id) {
                socket.send(JSON.stringify({
                    type: "UNSEEN_COUNT_UPDATE",
                    payload: {
                        conversationId: message.conversationId,
                        count: unreadCount,
                    },
                }));
            }
        }
    }
}

export async function createWebSocketServer(server: HttpServer) {
    const wss = new WebSocketServer({
        server,
        handleProtocols: (protocols) => protocols.has("chat-auth") ? "chat-auth" : false,
    });

    wss.on("connection", (ws, request) => {
        void authenticateSocket(String(request.headers["sec-websocket-protocol"] || "")).then(async (identity) => {
            if (!identity || ws.readyState !== WebSocket.OPEN) {
                ws.close(1008, "Authentication required");
                return;
            }

            connectionIdentity.set(ws, identity);
            const key = identityKey(identity);
            const sockets = connectedUsers.get(key) ?? new Set<WebSocket>();
            sockets.add(ws);
            connectedUsers.set(key, sockets);
            const lastSeenAt = new Date();
            await redis.set(onlineKey(identity), "1");
            await redis.expire(onlineKey(identity), 90);
            await redis.set(lastSeenKey(identity), String(lastSeenAt.getTime()));
            await updateParticipantPresence(identity, true, lastSeenAt);
            await notifyConversationPeers(identity, true, lastSeenAt);
        }).catch((error) => {
            console.error("Could not authenticate chat WebSocket:", error);
            ws.close(1011, "Could not authenticate connection");
        });

        ws.on("message", async (rawMessage) => {
            try {
                const message = rawMessage.toString();
                const identity = connectionIdentity.get(ws);
                if (!identity) return;

                const data = JSON.parse(message);
                if (data.type === "HEARTBEAT") {
                    const lastSeenAt = new Date();
                    await redis.set(onlineKey(identity), "1");
                    await redis.expire(onlineKey(identity), 90);
                    await redis.set(lastSeenKey(identity), String(lastSeenAt.getTime()));
                    return;
                }

                if (data.type === "MARK_AS_SEEN" && typeof data.conversationId === "string") {
                    const participant = await prisma.participant.findFirst({
                        where: {
                            conversationId: data.conversationId,
                            ...(identity.role === "seller"
                                ? { sellerId: identity.id }
                                : { userId: identity.id }),
                        },
                    });
                    if (participant) {
                        await prisma.participant.update({
                            where: { id: participant.id },
                            data: { unreadCount: 0, lastSeenAt: new Date() },
                        });
                        ws.send(JSON.stringify({
                            type: "UNSEEN_COUNT_UPDATE",
                            payload: { conversationId: data.conversationId, count: 0 },
                        }));
                    }
                }
            } catch (error) {
                console.error("Error processing chat WebSocket message:", error);
            }
        });

        ws.on("close", async () => {
            const identity = connectionIdentity.get(ws);
            if (!identity) return;

            const key = identityKey(identity);
            const sockets = connectedUsers.get(key);
            sockets?.delete(ws);
            if (!sockets?.size) {
                connectedUsers.delete(key);
                const lastSeenAt = new Date();
                try {
                    await redis.del(onlineKey(identity));
                    await redis.set(lastSeenKey(identity), String(lastSeenAt.getTime()));
                    await updateParticipantPresence(identity, false, lastSeenAt);
                    await notifyConversationPeers(identity, false, lastSeenAt);
                } catch (error) {
                    console.error("Could not update chat presence after disconnect:", error);
                }
            }
        });

        ws.on("error", (error) => {
            console.error("Chat WebSocket error:", error);
        });
    });

    console.log("Chat WebSocket server ready");
}
