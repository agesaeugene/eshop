import prisma from "@packages/libs/prisma";
import redis from "@packages/libs/redis";
import { NextFunction, Response } from "express";
import { AuthError, NotFoundError, ValidationError } from "@packages/error-handler";
import jwt from "jsonwebtoken";
import { publishChatMessage } from "../websocket";

const PAGE_SIZE = 20;

const getPresence = async (role: "user" | "seller" | "admin", id: string) => {
    const [onlineStatus, lastSeenAt] = await Promise.all([
        redis.get(`online:${role}:${id}`),
        redis.get(`last-seen:${role}:${id}`),
    ]);
    return {
        isOnline: Boolean(onlineStatus),
        lastSeenAt: lastSeenAt ? new Date(Number(lastSeenAt)).toISOString() : null,
    };
};

const getPage = (value: unknown) => {
    const page = Number.parseInt(String(value ?? "1"), 10);
    return Number.isInteger(page) && page > 0 ? page : 1;
};

const getMessages = async (conversationId: string, page: number) =>
    prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
    });

const resetUnreadCount = async (
    conversationId: string,
    role: "user" | "seller" | "admin",
    id: string
) => {
    const participant = await prisma.participant.findFirst({
        where: {
            conversationId,
            ...(role === "seller" ? { sellerId: id } : { userId: id }),
        },
    });
    if (!participant) return;

    await prisma.participant.update({
        where: { id: participant.id },
        data: { unreadCount: 0, lastSeenAt: new Date() },
    });
};

export const createSocketTicket = async (req: any, res: Response, next: NextFunction) => {
    try {
        const role = req.role as "user" | "seller" | "admin";
        const id = role === "seller" ? req.seller.id : req.user.id;
        const token = jwt.sign(
            { id, role, chatSocket: true },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "60s" }
        );
        return res.status(200).json({ token });
    } catch (error) {
        return next(error);
    }
};

export const newConversation = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { sellerId, productId } = req.body;
        const userId = req.user.id;

        if (!sellerId) return next(new ValidationError("Seller ID is required"));
        if (req.role !== "user") return next(new AuthError("Only customers can start seller conversations"));
        const seller = await prisma.sellers.findUnique({ where: { id: sellerId } });
        if (!seller) return next(new NotFoundError("Seller not found"));

        let productContext: {
            productId: string;
            title: string;
            slug: string;
            imageUrl: string | null;
            price: number;
        } | undefined;
        if (productId !== undefined) {
            if (typeof productId !== "string" || !productId) {
                return next(new ValidationError("Product is invalid."));
            }
            const product = await prisma.products.findFirst({
                where: {
                    id: productId,
                    isDeleted: false,
                    status: "Active",
                    shop: { sellerId },
                },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    sale_price: true,
                    images: { select: { url: true }, take: 1 },
                },
            });
            if (!product) return next(new NotFoundError("This product is no longer available from this seller."));
            productContext = {
                productId: product.id,
                title: product.title,
                slug: product.slug,
                imageUrl: product.images[0]?.url ?? null,
                price: product.sale_price,
            };
        }

        const existingGroup = await prisma.conversationGroup.findFirst({
            where: {
                isGroup: false,
                participantIds: { hasEvery: [userId, sellerId] },
            },
        });
        if (existingGroup) {
            const conversation = productContext
                ? await prisma.conversationGroup.update({
                    where: { id: existingGroup.id },
                    data: { productContext },
                })
                : existingGroup;
            return res.status(200).json({ conversation, isNew: false });
        }

        const conversation = await prisma.conversationGroup.create({
            data: {
                isGroup: false,
                creatorId: userId,
                participantIds: [userId, sellerId],
                productContext,
            },
        });
        await prisma.participant.createMany({
            data: [
                { conversationId: conversation.id, userId },
                { conversationId: conversation.id, sellerId },
            ],
        });

        return res.status(201).json({ conversation, isNew: true });
    } catch (error) {
        return next(error);
    }
};

export const createAdminConversation = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const sellerId = req.seller.id;
        const { adminId } = req.body;
        if (!adminId) return next(new ValidationError("Admin ID is required"));
        if (req.role !== "seller") return next(new AuthError("Only sellers can contact administrators"));

        const admin = await prisma.users.findFirst({
            where: { id: adminId, role: "admin" },
            select: { id: true },
        });
        if (!admin) return next(new NotFoundError("Admin not found"));

        const existing = await prisma.conversationGroup.findFirst({
            where: {
                isGroup: false,
                participantIds: { hasEvery: [sellerId, adminId] },
            },
        });
        if (existing) {
            return res.status(200).json({ conversation: existing, isNew: false });
        }

        const conversation = await prisma.conversationGroup.create({
            data: {
                isGroup: false,
                creatorId: sellerId,
                participantIds: [sellerId, adminId],
            },
        });
        await prisma.participant.createMany({
            data: [
                { conversationId: conversation.id, sellerId },
                { conversationId: conversation.id, userId: adminId },
            ],
        });

        return res.status(201).json({ conversation, isNew: true });
    } catch (error) {
        return next(error);
    }
};

export const getSellerAdmins = async (_req: any, res: Response, next: NextFunction) => {
    try {
        const admins = await prisma.users.findMany({
            where: { role: "admin" },
            select: {
                id: true,
                name: true,
                email: true,
                avatar: { select: { url: true } },
            },
            orderBy: { name: "asc" },
        });
        return res.status(200).json({
            admins: await Promise.all(admins.map(async (admin) => ({
                ...admin,
                ...await getPresence("admin", admin.id),
            }))),
        });
    } catch (error) {
        return next(error);
    }
};

export const getUserConversations = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user.id;
        const conversations = await prisma.conversationGroup.findMany({
            where: { participantIds: { has: userId } },
            orderBy: { updatedAt: "desc" },
        });

        const responseData = await Promise.all(conversations.map(async (group) => {
            const [sellerParticipant, ownParticipant, lastMessage] = await Promise.all([
                prisma.participant.findFirst({
                    where: { conversationId: group.id, sellerId: { not: null } },
                }),
                prisma.participant.findFirst({
                    where: { conversationId: group.id, userId },
                }),
                prisma.message.findFirst({
                    where: { conversationId: group.id },
                    orderBy: { createdAt: "desc" },
                }),
            ]);

            const seller = sellerParticipant?.sellerId
                ? await prisma.sellers.findUnique({
                    where: { id: sellerParticipant.sellerId },
                    include: { shop: { include: { avatar: true } } },
                })
                : null;

            return {
                conversationId: group.id,
                productContext: group.productContext,
                seller: {
                    id: seller?.id ?? null,
                    name: seller?.shop?.name || "Unknown",
                    ...(seller ? await getPresence("seller", seller.id) : { isOnline: false, lastSeenAt: null }),
                    avatar: seller?.shop?.avatar?.url ?? null,
                },
                lastMessage: lastMessage?.content || "Say something to start a conversation",
                lastMessageAt: lastMessage?.createdAt || group.updatedAt,
                unreadCount: ownParticipant?.unreadCount ?? 0,
            };
        }));

        return res.status(200).json({ conversations: responseData });
    } catch (error) {
        return next(error);
    }
};

export const getSellerConversations = async (req: any, res: Response, next: NextFunction) => {
    try {
        const sellerId = req.seller.id;
        const conversations = await prisma.conversationGroup.findMany({
            where: { participantIds: { has: sellerId } },
            orderBy: { updatedAt: "desc" },
        });

        const responseData = await Promise.all(conversations.map(async (group) => {
            const [userParticipant, ownParticipant, lastMessage] = await Promise.all([
                prisma.participant.findFirst({
                    where: { conversationId: group.id, userId: { not: null } },
                }),
                prisma.participant.findFirst({
                    where: { conversationId: group.id, sellerId },
                }),
                prisma.message.findFirst({
                    where: { conversationId: group.id },
                    orderBy: { createdAt: "desc" },
                }),
            ]);

            const user = userParticipant?.userId
                ? await prisma.users.findUnique({
                    where: { id: userParticipant.userId },
                    include: { avatar: true },
                })
                : null;
            const userRole = user?.role === "admin" ? "admin" : "user";

            return {
                conversationId: group.id,
                productContext: group.productContext,
                user: {
                    id: user?.id ?? null,
                    name: user?.name || "Unknown",
                    avatar: user?.avatar?.url ?? null,
                    isAdmin: userRole === "admin",
                    ...(user ? await getPresence(userRole, user.id) : { isOnline: false, lastSeenAt: null }),
                },
                lastMessage: lastMessage?.content || "Say something to start a conversation",
                lastMessageAt: lastMessage?.createdAt || group.updatedAt,
                unreadCount: ownParticipant?.unreadCount ?? 0,
            };
        }));

        return res.status(200).json({ conversations: responseData });
    } catch (error) {
        return next(error);
    }
};

export const getAdminConversations = async (req: any, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin.id;
        const conversations = await prisma.conversationGroup.findMany({
            where: { participantIds: { has: adminId } },
            orderBy: { updatedAt: "desc" },
        });

        const responseData = await Promise.all(conversations.map(async (group) => {
            const [sellerParticipant, ownParticipant, lastMessage] = await Promise.all([
                prisma.participant.findFirst({
                    where: { conversationId: group.id, sellerId: { not: null } },
                }),
                prisma.participant.findFirst({
                    where: { conversationId: group.id, userId: adminId },
                }),
                prisma.message.findFirst({
                    where: { conversationId: group.id },
                    orderBy: { createdAt: "desc" },
                }),
            ]);

            const seller = sellerParticipant?.sellerId
                ? await prisma.sellers.findUnique({
                    where: { id: sellerParticipant.sellerId },
                    include: { shop: { include: { avatar: true } } },
                })
                : null;

            return {
                conversationId: group.id,
                productContext: group.productContext,
                seller: {
                    id: seller?.id ?? null,
                    name: seller?.shop?.name || seller?.name || "Unknown seller",
                    avatar: seller?.shop?.avatar?.url ?? null,
                    ...(seller ? await getPresence("seller", seller.id) : { isOnline: false, lastSeenAt: null }),
                },
                lastMessage: lastMessage?.content || "Say something to start a conversation",
                lastMessageAt: lastMessage?.createdAt || group.updatedAt,
                unreadCount: ownParticipant?.unreadCount ?? 0,
            };
        }));

        return res.status(200).json({ conversations: responseData });
    } catch (error) {
        return next(error);
    }
};

export const fetchMessages = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const page = getPage(req.query.page);
        const conversation = await prisma.conversationGroup.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) return next(new NotFoundError("Conversation not found"));
        if (!conversation.participantIds.includes(userId)) {
            return next(new AuthError("Access denied to this conversation"));
        }

        const [sellerParticipant, messages] = await Promise.all([
            prisma.participant.findFirst({
                where: { conversationId, sellerId: { not: null } },
            }),
            getMessages(conversationId, page),
            resetUnreadCount(conversationId, "user", userId),
        ]);
        const seller = sellerParticipant?.sellerId
            ? await prisma.sellers.findUnique({
                where: { id: sellerParticipant.sellerId },
                include: { shop: { include: { avatar: true } } },
            })
            : null;

        return res.status(200).json({
            messages,
            seller: {
                id: seller?.id ?? null,
                name: seller?.shop?.name || "Unknown",
                avatar: seller?.shop?.avatar?.url ?? null,
                ...(seller ? await getPresence("seller", seller.id) : { isOnline: false, lastSeenAt: null }),
            },
            currentPage: page,
            hasMore: messages.length === PAGE_SIZE,
        });
    } catch (error) {
        return next(error);
    }
};

export const fetchSellerMessages = async (req: any, res: Response, next: NextFunction) => {
    try {
        const sellerId = req.seller.id;
        const { conversationId } = req.params;
        const page = getPage(req.query.page);
        const conversation = await prisma.conversationGroup.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) return next(new NotFoundError("Conversation not found"));
        if (!conversation.participantIds.includes(sellerId)) {
            return next(new AuthError("Access denied to this conversation"));
        }

        const [userParticipant, messages] = await Promise.all([
            prisma.participant.findFirst({
                where: { conversationId, userId: { not: null } },
            }),
            getMessages(conversationId, page),
            resetUnreadCount(conversationId, "seller", sellerId),
        ]);
        const user = userParticipant?.userId
            ? await prisma.users.findUnique({
                where: { id: userParticipant.userId },
                include: { avatar: true },
            })
            : null;
        const userRole = user?.role === "admin" ? "admin" : "user";

        return res.status(200).json({
            messages,
            user: {
                id: user?.id ?? null,
                name: user?.name || "Unknown",
                avatar: user?.avatar?.url ?? null,
                isAdmin: userRole === "admin",
                ...(user ? await getPresence(userRole, user.id) : { isOnline: false, lastSeenAt: null }),
            },
            currentPage: page,
            hasMore: messages.length === PAGE_SIZE,
        });
    } catch (error) {
        return next(error);
    }
};

export const fetchAdminMessages = async (req: any, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin.id;
        const { conversationId } = req.params;
        const page = getPage(req.query.page);
        const conversation = await prisma.conversationGroup.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) return next(new NotFoundError("Conversation not found"));
        if (!conversation.participantIds.includes(adminId)) {
            return next(new AuthError("Access denied to this conversation"));
        }

        const [sellerParticipant, messages] = await Promise.all([
            prisma.participant.findFirst({
                where: { conversationId, sellerId: { not: null } },
            }),
            getMessages(conversationId, page),
            resetUnreadCount(conversationId, "admin", adminId),
        ]);
        const seller = sellerParticipant?.sellerId
            ? await prisma.sellers.findUnique({
                where: { id: sellerParticipant.sellerId },
                include: { shop: { include: { avatar: true } } },
            })
            : null;

        return res.status(200).json({
            messages,
            seller: {
                id: seller?.id ?? null,
                name: seller?.shop?.name || seller?.name || "Unknown seller",
                avatar: seller?.shop?.avatar?.url ?? null,
                ...(seller ? await getPresence("seller", seller.id) : { isOnline: false, lastSeenAt: null }),
            },
            currentPage: page,
            hasMore: messages.length === PAGE_SIZE,
        });
    } catch (error) {
        return next(error);
    }
};

export const sendMessage = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { conversationId, content } = req.body;
        const role = req.role as "user" | "seller" | "admin";
        const senderId = role === "seller" ? req.seller.id : req.user.id;
        const messageContent = typeof content === "string" ? content.trim() : "";

        if (!conversationId || !messageContent) {
            return next(new ValidationError("Conversation ID and message content are required"));
        }
        if (messageContent.length > 5000) {
            return next(new ValidationError("Message must be 5000 characters or fewer"));
        }

        const conversation = await prisma.conversationGroup.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) return next(new NotFoundError("Conversation not found"));
        if (!conversation.participantIds.includes(senderId)) {
            return next(new AuthError("Access denied to this conversation"));
        }

        const participants = await prisma.participant.findMany({
            where: { conversationId },
        });
        const senderParticipant = participants.find((participant) =>
            role === "seller"
                ? participant.sellerId === senderId
                : participant.userId === senderId
        );
        const receiverParticipant = participants.find(
            (participant) => participant.id !== senderParticipant?.id
        );
        if (!senderParticipant || !receiverParticipant) {
            return next(new AuthError("Conversation participants are invalid"));
        }

        const receiver = receiverParticipant.sellerId
            ? { role: "seller" as const, id: receiverParticipant.sellerId }
            : receiverParticipant.userId
                ? {
                    role: (await prisma.users.findUnique({
                        where: { id: receiverParticipant.userId },
                        select: { role: true },
                    }))?.role === "admin"
                        ? "admin" as const
                        : "user" as const,
                    id: receiverParticipant.userId,
                }
                : null;
        if (!receiver) return next(new AuthError("Conversation receiver is invalid"));

        const createdAt = new Date();
        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId,
                senderType: role,
                content: messageContent,
                createdAt,
            },
        });
        let unreadCount = receiverParticipant.unreadCount + 1;
        try {
            const [, updatedReceiver] = await Promise.all([
                prisma.conversationGroup.update({
                    where: { id: conversationId },
                    data: { updatedAt: createdAt },
                }),
                prisma.participant.update({
                    where: { id: receiverParticipant.id },
                    data: { unreadCount: { increment: 1 } },
                }),
            ]);
            unreadCount = updatedReceiver.unreadCount;
        } catch (metadataError) {
            console.error("Message was saved but conversation metadata update failed:", metadataError);
        }

        try {
            await publishChatMessage(
                message,
                { role, id: senderId },
                receiver,
                unreadCount
            );
        } catch (publishError) {
            console.error("Message was saved but live delivery failed:", publishError);
        }

        return res.status(201).json({ message });
    } catch (error) {
        return next(error);
    }
};
