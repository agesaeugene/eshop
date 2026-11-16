import express, { Router } from "express";
import isAuthenticated from "@packages/middleware/isAuthenticated";
import { isAdmin, isSeller, isUser } from "@packages/middleware/authorizeRoles";
import {
    getUserOrders,
    getSellerOrders,
    getOrderDetails,
    updateDeliveryStatus,
    getDashboardStats,
    getAdminOrders,
    adminUpdateDeliveryStatus,
} from "../controllers/order.controller";
import {
    createPaymentSession,
    verifyCheckoutCoupon,
    getCheckoutSession,
    startMpesaPayment,
    payWithWallet,
    intasendWebhook,
    getWallet,
    startWalletTopup,
    createSellerWithdrawal,
    getWalletPaymentStatus,
    getAdminFinance,
    reviewSellerWithdrawal,
} from "../controllers/finance.controller";
import {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "../controllers/notification.controller";
import { isAdminAuthenticated } from "../../../packages/middleware/isAuthenticated";

const router: Router = express.Router();

// ── Payments ─────────────────────────────────────────────
router.post("/create-payment-session", isAuthenticated, isUser, createPaymentSession);
router.put("/verify-coupon", isAuthenticated, isUser, verifyCheckoutCoupon);
router.get("/verifying-payment-session", isAuthenticated, isUser, getCheckoutSession);
router.post("/checkout/:sessionId/mpesa", isAuthenticated, isUser, startMpesaPayment);
router.post("/checkout/:sessionId/wallet", isAuthenticated, isUser, payWithWallet);
router.get("/payment-status", isAuthenticated, isUser, getWalletPaymentStatus);
router.get("/wallet", isAuthenticated, getWallet);
router.post("/wallet/topup", isAuthenticated, isUser, startWalletTopup);
router.post("/wallet/withdrawals", isAuthenticated, isSeller, createSellerWithdrawal);
router.post("/intasend/webhook", intasendWebhook);
router.get("/admin/finance", isAdminAuthenticated, isAdmin, getAdminFinance);
router.put("/admin/withdrawals/:id/review", isAdminAuthenticated, isAdmin, reviewSellerWithdrawal);

// ── Customer ─────────────────────────────────────────────
router.get("/get-user-orders", isAuthenticated, getUserOrders);
router.get("/get-order-details/:id", isAuthenticated, getOrderDetails);

// ── Seller ───────────────────────────────────────────────
router.get("/get-seller-orders", isAuthenticated, isSeller, getSellerOrders);
router.put("/update-status/:orderId", isAuthenticated, isSeller, updateDeliveryStatus);
router.get("/get-dashboard-stats", isAuthenticated, isSeller, getDashboardStats);

// ── Notifications ────────────────────────────────────────
router.get("/notifications", isAuthenticated, getUserNotifications);
router.put("/notifications/mark-all-read", isAuthenticated, markAllNotificationsRead);
router.put("/notifications/:id/read", isAuthenticated, markNotificationRead);

// ── Admin ────────────────────────────────────────
router.get("/get-admin-orders", isAdminAuthenticated, isAdmin, getAdminOrders);
router.put("/admin/orders/:orderId/delivery-status", isAdminAuthenticated, isAdmin, adminUpdateDeliveryStatus);


export default router;