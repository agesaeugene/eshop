import express, { Router } from 'express';
import {
    loginUser, resetUserPassword, userForgotPassword, userRegistration,
    verifyUser, verifyUserForgotPasswordOtp, refreshToken, getUser,
    registerSeller, verifySeller, createShop, loginSeller, getSeller,
    connectMpesa, verifyMpesa, refreshSellerToken,
    getUserAddresses,
    addUserAddress,
    deleteUserAddress,

    changeUserPassword,
    loginAdmin,
    refreshAdminToken,
    sendChangePasswordOtp,
    logoutUser,
    getAdmin,
    logoutAdmin,
    logoutSeller,
    heartbeatAccountActivity,
} from '../controllers/auth.controller';
import isAuthenticated from '@packages/middleware/isAuthenticated';
import { isSeller, isUser } from '@packages/middleware/authorizeRoles';
import { isAdminAuthenticated } from '@packages/middleware/isAuthenticated';
import {
    changeSellerPassword,
    getSellerSettings,
    sendSellerPasswordChangeOtp,
    updateSellerSettings,
} from '../controllers/seller-settings.controller';

const router: Router = express.Router();

// M-Pesa
router.post("/connect-mpesa", connectMpesa);
router.post("/verify-mpesa", verifyMpesa);

// User auth
router.post("/user-registration", userRegistration);
router.post("/verify-user", verifyUser);
router.post("/login-user", loginUser);
router.post("/refresh-token-user", refreshToken);
router.get("/logged-in-user", isAuthenticated, getUser);
router.post("/session-heartbeat", isAuthenticated, heartbeatAccountActivity);
router.post("/forgot-password-user", userForgotPassword);
router.post("/reset-password-user", resetUserPassword);
router.post("/verify-forgot-password-user", verifyUserForgotPasswordOtp);
router.post("/change-password/send-otp", isAuthenticated, sendChangePasswordOtp);
router.put("/change-password", isAuthenticated, changeUserPassword);

router.get("/shipping-addresses", isAuthenticated, isUser, getUserAddresses);
router.post("/add-address", isAuthenticated, isUser, addUserAddress);
router.delete("/delete-address/:addressId", isAuthenticated, isUser, deleteUserAddress);

//router.get("/orders", isAuthenticated, getUserOrders);

// router.get("/notifications", isAuthenticated, getUserNotifications);
// router.put("/notifications/:id/read", isAuthenticated, markNotificationRead);
// router.put("/notifications/mark-all-read", isAuthenticated, markAllNotificationsRead);

//router.get("/get-layouts", getWebsiteLayout);


// Seller auth
router.post("/seller-registration", registerSeller);
router.post("/verify-seller", verifySeller);
router.post("/create-shop", createShop);
router.post("/login-seller", loginSeller);
router.post("/refresh-token-seller", refreshToken);
router.get("/logged-in-seller", isAuthenticated, isSeller, getSeller);
router.post("/seller/session-heartbeat", isAuthenticated, isSeller, heartbeatAccountActivity);
router.get("/seller-settings", isAuthenticated, isSeller, getSellerSettings);
router.put("/seller-settings", isAuthenticated, isSeller, updateSellerSettings);
router.post("/seller-change-password/send-otp", isAuthenticated, isSeller, sendSellerPasswordChangeOtp);
router.put("/seller-change-password", isAuthenticated, isSeller, changeSellerPassword);

//Admin auth
router.post("/login-admin", loginAdmin);
router.post("/refresh-admin", refreshAdminToken);
router.get("/logged-in-admin", isAdminAuthenticated, getAdmin);
router.post("/admin/session-heartbeat", isAdminAuthenticated, heartbeatAccountActivity);
router.post("/logout-admin", logoutAdmin);
router.post("/logout-seller", logoutSeller);


router.get("/logout-user", logoutUser);

export default router;