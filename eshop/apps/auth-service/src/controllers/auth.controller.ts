import { NextFunction, Request, Response } from 'express';
import {
    checkOtpRestrictions, handleForgotPassword, sendOtp, trackOtpRequests, validateRegistrationData, verifyOtp, verifyForgotPasswordOtp, handleResetPassword,
    refreshToken as refreshTokenHelper,
} from '../utils/auth.helper';
import prisma from '@packages/libs/prisma';
import { AuthError, ValidationError } from '@packages/error-handler';
import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';
import redis from '@packages/libs/redis';





export const connectMpesa = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { sellerId, phone_number } = req.body;

        if (!sellerId || !phone_number) {
            return next(new ValidationError("Seller ID and phone number are required!"));
        }

        const seller = await prisma.sellers.findUnique({ where: { id: sellerId } });
        if (!seller) return next(new ValidationError("Seller not found!"));

        // Save the M-Pesa number directly — no OTP needed
        await prisma.sellers.update({
            where: { id: sellerId },
            data: {
                mpesa_number: phone_number,
                phone_verified: true,
            },
        });

        res.status(200).json({
            success: true,
            message: "M-Pesa number connected successfully!",
        });
    } catch (error) {
        next(error);
    }
};

// Kept as stub so the route doesn't break if called, but no longer used
export const verifyMpesa = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.status(200).json({ success: true, message: "No verification required." });
};

// Register a new User
export const userRegistration = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateRegistrationData(req.body, "user");
        const { name, email } = req.body;

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ValidationError("User already exists with this email!"));
        }

        // Check OTP restrictions - stop execution if restricted
        const isRestricted = await checkOtpRestrictions(email, next, "user");
        if (isRestricted) return;

        // Track OTP requests - stop execution if spam limit hit
        const isSpamBlocked = await trackOtpRequests(email, next, "user");
        if (isSpamBlocked) return;

        await sendOtp(name, email, "user-activation-mail", "user");

        res.status(200).json({
            message: "OTP sent to email. Please verify your account.",
        });
    } catch (error) {
        return next(error);
    }
};

// Verify user with OTP
export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, otp, password, name } = req.body;
        if (!email || !otp || !password || !name) {
            return next(new ValidationError("All fields are required!"));
        }

        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            return next(new ValidationError("User already exists with this email!"));
        }

        const otpValid = await verifyOtp(email, otp, next, "user");
        if (!otpValid) return;

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.users.create({
            data: { name, email, password: hashedPassword }
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully!",
        });
    } catch (error) {
        return next(error);
    }
};

// Login user
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ValidationError("Email and password are required!"));
        }

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) return next(new AuthError("User does not exist!"));

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password!);
        if (!isMatch) {
            return next(new AuthError("Invalid email or password!"));
        }

        // Generating access and refresh tokens
        const accessToken = jwt.sign(
            { id: user.id, role: "user" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: '15m' }
        );
        const refreshToken = jwt.sign(
            { id: user.id, role: "user" },
            process.env.REFRESH_TOKEN_SECRET!,
            { expiresIn: '7d' }
        );

        // Storing the refresh token in a http only secure cookie
        setCookie(res, "refresh_token", refreshToken);
        setCookie(res, "access_token", accessToken);

        res.status(200).json({
            success: true,
            message: "Login successful!",
            user: { id: user.id, email: user.email, name: user.name }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return next(error);
    }
};

export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken =
        req.cookies["refresh_token"] ||
        req.cookies["seller-refresh-token"] ||
        req.headers.authorization?.split(" ")[1];

        if (!refreshToken) {
            throw new ValidationError("Refresh token not found! Please log in again.");
        }

        // Verify the refresh token
        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET as string
        ) as { id: string; role?: string };

        if (!decoded || !decoded.id || !decoded.role) {
            throw new JsonWebTokenError("Forbidden! Invalid refresh token! Please log in again.");
        }

        let account;

        if (decoded.role === "user") {
            account = await prisma.users.findUnique({ where: { id: decoded.id } });
        } else if (decoded.role === "seller") {
            account = await prisma.sellers.findUnique({
                where: { id: decoded.id },
                include: { shop: true },
            });
        }

        
        if (!account) {
            throw new AuthError("User not found! Please log in again.");
        }

        // Issue a new access token
        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role ?? "user" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        // Set new access token in cookie
        if(decoded.role === "user") {
            setCookie(res, "access_token", newAccessToken)
        } else if (decoded.role === "seller") {
            setCookie(res, "seller-access-token", newAccessToken)
        }

      

        res.status(200).json({
            success: true,
            message: "Access token refreshed successfully!",
        });

    } catch (error) {
        // jwt.verify throws on expiry/invalid — treat as auth failure
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return next(new ValidationError("Invalid or expired refresh token! Please log in again."));
        }
        next(error);
    }
};

//Getting the logged in user
export const getUser = async (req: any, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        res.status(201).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

// Verify user forgot password OTP
export const verifyUserForgotPasswordOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            throw new ValidationError("Email and OTP are required!");

        const isValid = await verifyOtp(email, otp, next, "user");
        if (!isValid) return;

        res.status(200).json({
            success: true,
            message: "OTP verified successfully! You can now reset your password.",
        });
    } catch (error) {
        next(error);
    }
};

// User forgot password
export const userForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    await handleForgotPassword(req, res, next, "user");
};

// Verify user forgot password OTP handler
export const verifyUserForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    await verifyUserForgotPasswordOtp(req, res, next);
};

// Reset User password
export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return next(new ValidationError("Email and password are required!"));
        }

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) return next(new ValidationError("No user found with this email!"));

        // Comparing new password with old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password!);
        if (isSamePassword) {
            return next(new ValidationError("New password cannot be the same as the old password!"));
        }

        // Hashing new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Updating password in database
        await prisma.users.update({
            where: { email },
            data: { password: hashedPassword }
        });

        res.status(200).json({
            success: true,
            message: "Password reset successfully!",
        });
    } catch (error) {
        next(error);
    }
};


export const refreshSellerToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.["seller-refresh-token"];

        if (!token) {
            throw new ValidationError("Refresh token not found! Please log in again.");
        }

        const decoded = jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET as string
        ) as { id: string; role?: string };

        if (!decoded?.id || decoded.role !== "seller") {
            throw new JsonWebTokenError("Forbidden! Invalid refresh token!");
        }

        const seller = await prisma.sellers.findUnique({ where: { id: decoded.id } });
        if (!seller) {
            throw new AuthError("Seller not found! Please log in again.");
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, role: "seller" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        setCookie(res, "seller-access-token", newAccessToken);

        res.status(200).json({
            success: true,
            message: "Seller access token refreshed successfully!",
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return next(new ValidationError("Invalid or expired refresh token! Please log in again."));
        }
        next(error);
    }
};

//registering a new seller
export const registerSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateRegistrationData(req.body, "seller");
        const { name, email } = req.body;

        const existingSeller = await prisma.sellers.findUnique({
            where: { email },
        });

        if (existingSeller) {
            throw new ValidationError(" seller already exists with this email!");
        }

        const isRestricted = await checkOtpRestrictions(email, next, "seller");
        if (isRestricted) return;

        const isSpamBlocked = await trackOtpRequests(email, next, "seller");
        if (isSpamBlocked) return;

        await sendOtp(name, email, "seller-activation-mail", "seller");

        res.status(200).json({ message: "OTP sent to email. Please verify your account." });

    } catch (error) {
        console.error("❌ registerSeller ERROR:", error);
        next(error);
    }
};

//verifying seller with otp
export const verifySeller = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, otp, password, name, phone_number, country } = req.body;

        if (!email || !otp || !password || !name || !phone_number || !country) {
            return next(new ValidationError("All fields are required"));
        }

        const existingSeller = await prisma.sellers.findUnique({
            where: { email }
        });

        if (existingSeller)
            return next(
                new ValidationError("Seller already exists with this email")
            );

        const otpValid = await verifyOtp(email, otp, next, "seller");
        if (!otpValid) return;

        const hashedPassword = await bcrypt.hash(password, 10);

        const seller = await prisma.sellers.create({
            data: {
                name, email, password: hashedPassword, country, phone_number
            },
        });

        res.status(201).json({ seller, message: "Seller registered successfully!" });

    } catch (error) {
        next(error)
    }
};

//creating a new shop
export const createShop = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, bio, address, opening_hours, website, category, sellerId } = req.body;
        if (!name || !bio || !address || !sellerId || !opening_hours || !category) {
            return next(new ValidationError("All fields are required!"));
        }
        const shopData: any = {
            name, bio, address, opening_hours, category, sellerId
        };

        if (website && website.trim() !== "") {
            shopData.website = website;
        }

        const shop = await prisma.shops.create({
            data: shopData,
        });

        res.status(201).json({
            success: true,
            message: "Shop created successfully!",
            shop,
        });
    } catch (error) {
        next(error);
    }
}

//creating stripe connect account link
// export const createStripeConnectLink = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const { sellerId } = req.body;

//         if (!sellerId) return next(new ValidationError("Seller ID is required"));

//         const seller = await prisma.sellers.findUnique({
//             where: {
//                 id: sellerId,
//             },
//         });

//         if (!seller) {
//             return next(new ValidationError("Seller is not available with this Id!"));
//         }

//         const account = await stripe.accounts.create({
//             type: "express",
//             email: seller?.email,
//             country: "KEN",
//             capabilities: {
//                 card_payments: { requested: true },
//                 transfers: { requested: true },
//             },
//         });

//         await prisma.sellers.update({
//             where: {
//                 id: sellerId,
//             },
//             data: {
//                 stripeId: account.id,
//             },
//         });

//         const accountLink = await stripe.accountLinks.create({
//             account: account.id,
//             refresh_url: `http://localhost:3000/success`,
//             return_url: `http://localhost:3000/success`,
//             type: "account_onboarding",
//         });

//         res.json({ url: accountLink.url });

//     } catch (error) {
//         next(error);
//     }
// };

//creating mpesa api connection


// login Seller
export const loginSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return next(new ValidationError("Email and password are required!"));

        const seller = await prisma.sellers.findUnique({ where: { email } });
        if (!seller) return next(new ValidationError("Invalid email or password!"));

        //verify Password
        const isMatch = await bcrypt.compare(password, seller.password!);
        if (!isMatch)
            return next(new ValidationError("Invalid Email or Password"));

        //Generating access tokens and refresh token
        const accessToken = jwt.sign(
            { id: seller.id, role: "seller" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { id: seller.id, role: "seller" },
            process.env.REFRESH_TOKEN_SECRET as string,
            { expiresIn: "7d" }
        );

        //storing refresh token
        setCookie(res, "seller-refresh-token", refreshToken)
        setCookie(res, "seller-access-token", accessToken)

        res.status(200).json({
            message: "Login successful!",
            seller: { id: seller.id, email: seller.email, name: seller.name },
        })

    } catch (error) {
        next(error);
    }
};

// get logged in Seller
export const getSeller = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const seller = req.seller;
        res.status(201).json({
            success: true,
            seller,
        });
    } catch (error) {
        next(error)
    }
};