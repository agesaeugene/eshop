import isAuthenticated from "@packages/middleware/isAuthenticated";
import { isSeller } from "@packages/middleware/authorizeRole";
import express, { Router } from "express";
import {
    createPaymentIntent,
    createPaymentSession,
    verifyingPaymentSession,
    getSellerOrders,
    getOrderDetails,
    updateDeliveryStatus,
    createOrder,
    getDashboardStats,
} from "../controllers/order.controller";

const router: Router = express.Router();

router.post("/create-payment-intent", isAuthenticated, createPaymentIntent);
router.post("/create-payment-session", isAuthenticated, createPaymentSession);
router.get("/verifying-payment-session", isAuthenticated, verifyingPaymentSession);
router.post("/create-order", createOrder); 
router.get("/get-seller-orders", isAuthenticated, isSeller, getSellerOrders);
router.get("/get-order-details/:id", isAuthenticated, getOrderDetails);
router.put("/update-status/:orderId", isAuthenticated, isSeller, updateDeliveryStatus);

router.get("/get-dashboard-stats", isAuthenticated, isSeller, getDashboardStats);

export default router;