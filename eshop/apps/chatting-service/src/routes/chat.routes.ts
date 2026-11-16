import isAuthenticated from "@packages/middleware/isAuthenticated";
import express from "express";
import {
    createAdminConversation,
    createSocketTicket,
    fetchAdminMessages,
    fetchMessages,
    fetchSellerMessages,
    getAdminConversations,
    getSellerAdmins,
    getSellerConversations,
    getUserConversations,
    newConversation,
    sendMessage,
} from "../controller/chatting.controllers";
import { isAdmin, isSeller, isUser } from "@packages/middleware/authorizeRoles";
import { isAdminAuthenticated } from "@packages/middleware/isAuthenticated";

const router = express.Router();

router.post("/create-user-conversationGroup", isAuthenticated, isUser, newConversation);
router.get("/get-user-conversations", isAuthenticated, isUser, getUserConversations);
router.get("/get-seller-conversations", isAuthenticated, isSeller, getSellerConversations);
router.get("/get-messages/:conversationId", isAuthenticated, isUser, fetchMessages);
router.get("/get-seller-messages/:conversationId", isAuthenticated, isSeller, fetchSellerMessages);
router.post("/send-message", isAuthenticated, sendMessage);
router.post("/socket-ticket", isAuthenticated, createSocketTicket);
router.post("/admin/socket-ticket", isAdminAuthenticated, isAdmin, createSocketTicket);

router.get("/get-admins", isAuthenticated, isSeller, getSellerAdmins);
router.post("/create-admin-conversation", isAuthenticated, isSeller, createAdminConversation);

router.get("/get-admin-conversations", isAdminAuthenticated, isAdmin, getAdminConversations);
router.get("/get-admin-messages/:conversationId", isAdminAuthenticated, isAdmin, fetchAdminMessages);
router.post("/admin-send-message", isAdminAuthenticated, isAdmin, sendMessage);

export default router;