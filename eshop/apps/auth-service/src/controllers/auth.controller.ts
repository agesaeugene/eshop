import { NextFunction, Request, Response } from 'express';
import { checkOtpRestrictions, handleForgotPassword, sendOtp, trackOtpRequests, validateRegistrationData, verifyOtp, verifyForgotPasswordOtp, handleResetPassword,
    refreshToken as refreshTokenHelper, } from '../utils/auth.helper';
import prisma from '@packages/libs/prisma';
import { AuthError, ValidationError } from '@packages/error-handler';
import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';
import { name } from 'ejs';

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
        const isRestricted = await checkOtpRestrictions(email, next);
        if (isRestricted) return;

        // Track OTP requests - stop execution if spam limit hit
        const isSpamBlocked = await trackOtpRequests(email, next);
        if (isSpamBlocked) return;

        await sendOtp(name, email, "user-activation-mail");

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

        const otpValid = await verifyOtp(email, otp, next);
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
            { id: user.id },
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
        const token = req.cookies?.refresh_token;

        if (!token) {
            throw new ValidationError("Refresh token not found! Please log in again.");
        }

        // Verify the refresh token
        const decoded = jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET as string
        ) as { id: string; role?: string };

        if (!decoded || !decoded?.id || !decoded?.role) {
            throw new JsonWebTokenError("Forbiden! Invalid refresh token! Please log in again.");
        }

       // let account;
       // if (decoded.role === "user") {
       //     account = await prisma.users.findUnique({ where: { id: decoded.id } });
       // } else {
       //     account = await prisma.seller.findUnique({ where: { id: decoded.id } });
       // }
       
       const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!user) {
            throw new AuthError("User/Seller not found! Please log in again.");
        }

        // Issue a new access token
        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role ?? "user" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        // Set new access token in cookie
        setCookie(res, "access_token", newAccessToken);

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

//Getting the logges in user
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

        const isValid = await verifyOtp(email, otp, next);
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

//registering a new seller
export const registerSeller = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        validateRegistrationData(req.body, "seller");
        const {name, email} = req.body;

        
        const existingSeller = await prisma.sellers.findUnique({
            where: { email },
        }); 

        if (existingSeller) {
            throw new ValidationError(" seller already exists with this email!");
        }

        await checkOtpRestrictions(email, next);
        await trackOtpRequests(email, next);
        await sendOtp(name, email, "seller-activation");

        res.status(200).json({ message: "OTP sent to email. Please verify your account."});

    } catch (error){
        next(error);
    }
};

//verifying seller with otp
export const verifySeller = async(
    req: Request,
    res: Response,
    next: NextFunction

) => {
    try {
        const { email, otp, password, name, phone_number, country } = req.body;

        if ( !email || !otp || !password || !name || !phone_number || !country) {
            return next(new ValidationError("All fields are required"));         
        }

        const existingSeller = await prisma.sellers.findUnique({
            where: { email }
        });

        if (existingSeller)
            return next(
        new ValidationError("Seller already exists with this email")
    );

    await verifyOtp(email, otp, next);
    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await prisma.sellers.create({
        data: {
            name, email, password: hashedPassword, country, phone_number
        },
    });

    res.status(201).json({ seller, message: "Seller registered successfully!"});
    
    } catch (error){
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
        if (!name || !bio || !address || !sellerId || !opening_hours || !category)
        {
            return next( new ValidationError("All fields are required!"));
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