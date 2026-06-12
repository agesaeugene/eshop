import express, { Router } from 'express';
import {
    loginUser, resetUserPassword, userForgotPassword, userRegistration,
    verifyUser, verifyUserForgotPasswordOtp, refreshToken, getUser,
    registerSeller, verifySeller, createShop, loginSeller, getSeller,
    connectMpesa, verifyMpesa, refreshSellerToken,
} from '../controllers/auth.controller';
import isAuthenticated from '@packages/middleware/isAuthenticated';
import { isSeller } from '@packages/middleware/authorizeRole';

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
router.post("/forgot-password-user", userForgotPassword);
router.post("/reset-password-user", resetUserPassword);
router.post("/verify-forgot-password-user", verifyUserForgotPasswordOtp);

// Seller auth
router.post("/seller-registration", registerSeller);
router.post("/verify-seller", verifySeller);
router.post("/create-shop", createShop);
router.post("/login-seller", loginSeller);
router.post("/refresh-token-seller", refreshSellerToken);   // ← new
router.get("/logged-in-seller", isAuthenticated, isSeller, getSeller);

export default router;