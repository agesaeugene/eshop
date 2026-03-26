import { NextFunction, Request, Response } from 'express';
import { checkOtpRestrictions, handleForgotPassword, sendOtp, trackOtpRequests, validateRegistrationData, verifyOtp } from '../utils/auth.helper';
import prisma from '@packages/libs/prisma';
import { AuthError, ValidationError } from '@packages/error-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';

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
        const refreshToken = jwt.sign(  // ← fix: Id → id
            { id: user.id },
            process.env.REFRESH_TOKEN_SECRET!,
            { expiresIn: '7d' }
        );

        // Storing the refresh token in a http only secure cookie
        setCookie(res, "refresh_token", refreshToken);
        setCookie(res, "access_token", accessToken);

        // ← fix: removed duplicate res.json, merged into one response
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

// Verify user forgot password OTP
// ← fix: moved above verifyUserForgotPassword so it's defined before use
export const verifyUserForgotPasswordOtp = async (
    req: Request,
    res: Response,
    next: NextFunction
    // ← fix: removed unused "userrType" parameter
) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp)
            throw new ValidationError("Email and OTP are required!");

        // ← fix: guard against invalid OTP
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