import crypto from "crypto";
import { ValidationError } from "@packages/error-handler";
import redis from "@packages/libs/redis";
import { sendEmail } from "./sendMail";
import { Request, Response, NextFunction } from "express";
import prisma from "@packages/libs/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setCookie } from "./cookies/setCookie";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Role = "user" | "seller" | "admin";

const TOKEN_COOKIES: Record<Role, { refresh: string; access: string }> = {
    user:   { refresh: "refresh_token",        access: "access_token" },
    seller: { refresh: "seller-refresh-token", access: "seller-access-token" },
    admin:  { refresh: "admin-refresh-token",  access: "admin-access-token" },
};

// admins are stored in the `users` collection
const findAccountByEmail = (role: Role, email: string) =>
    role === "seller"
        ? prisma.sellers.findUnique({ where: { email } })
        : prisma.users.findUnique({ where: { email } });

export const validateRegistrationData = (data: any, userType: "user" | "seller") => {
    const { name, email, password, phone_number, country } = data;

    if (
        !name || !email || !password || (userType === "seller" && (!phone_number || !country))
    ) {
        throw new ValidationError("Missing required fields!");
    }

    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format!");
    }
};

export const checkOtpRestrictions = async (
    email: string,
    next: NextFunction,
    role: Role = "user"
): Promise<boolean> => {
    if (await redis.get(`otp_lock:${role}:${email}`)) {
        next(new ValidationError("Account locked due to multiple failed attempts! Try again after 30 minutes."));
        return true;
    }
    if (await redis.get(`otp_spam_lock:${role}:${email}`)) {
        next(new ValidationError("Too many OTP requests! Please wait 1 hour and try again."));
        return true;
    }
    if (await redis.get(`otp_cooldown:${role}:${email}`)) {
        next(new ValidationError("Please wait a minute before requesting a new OTP again!"));
        return true;
    }
    return false;
};

export const trackOtpRequests = async (
    email: string,
    next: NextFunction,
    role: Role = "user"
): Promise<boolean> => {
    const otpRequestKey = `otp_requests_count:${role}:${email}`;
    const otpRequests = parseInt((await redis.get(otpRequestKey)) || "0");

    if (otpRequests >= 2) {
        await redis.set(`otp_spam_lock:${role}:${email}`, "locked", "EX", 60 * 60);
        next(new ValidationError("Too many OTP requests! Please wait 1 hour and try again."));
        return true;
    }

    await redis.set(otpRequestKey, otpRequests + 1, "EX", 60 * 60);
    return false;
};

export const sendOtp = async (
    name: string,
    email: string,
    template: string,
    role: Role = "user"
) => {
    const otp = crypto.randomInt(1000, 9999).toString();
    await redis.set(`otp:${role}:${email}`, otp, "EX", 5 * 60);
    await redis.set(`otp_cooldown:${role}:${email}`, "true", "EX", 60);
    await sendEmail(email, "Verify Your Email", template, { name, otp });
};

export const verifyOtp = async (
    email: string,
    otp: string,
    next: NextFunction,
    role: Role = "user"
): Promise<boolean> => {
    const redisKey = `otp:${role}:${email}`;
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp) {
        next(new ValidationError("OTP expired! Please request a new one."));
        return false;
    }

    const failedAttemptsKey = `otp_failed_attempts:${role}:${email}`;
    const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || "0");

    if (storedOtp !== otp) {
        if (failedAttempts >= 2) {
            await redis.set(`otp_lock:${role}:${email}`, "locked", "EX", 30 * 60);
            await redis.del(`otp:${role}:${email}`, failedAttemptsKey);
            next(new ValidationError("Account locked due to multiple failed attempts! Try again after 30 minutes."));
            return false;
        }

        await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", 30 * 60);
        next(new ValidationError(`Invalid OTP! You have ${2 - failedAttempts} attempts left before your account gets locked.`));
        return false;
    }

    await redis.del(`otp:${role}:${email}`, failedAttemptsKey);
    return true;
};

export const handleForgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
    userType: Role
) => {
    try {
        const { email } = req.body;

        if (!email) throw new ValidationError("Email is required!");

        const user = await findAccountByEmail(userType, email);
        if (!user) throw new ValidationError(`No ${userType} found with this email!`);

        const isRestricted = await checkOtpRestrictions(email, next, userType);
        if (isRestricted) return;

        const isSpamBlocked = await trackOtpRequests(email, next, userType);
        if (isSpamBlocked) return;

        const template =
            userType === "seller"
                ? "seller-forgot-password-mail"
                : "user-forgot-password-mail";

        await sendOtp(user.name, email, template, userType);

        res.status(200).json({
            message: "OTP sent to email for password reset. Please verify your account!",
        });
    } catch (error) {
        next(error);
    }
};

export const verifyForgotPasswordOtp = async (
    req: Request,
    res: Response,
    next: NextFunction,
    userType: Role = "user"
) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            throw new ValidationError("Email and OTP are required!");
        }

        const isValid = await verifyOtp(email, otp, next, userType);
        if (!isValid) return;

        // proof that the OTP was verified; required by the reset step
        await redis.set(`reset_verified:${userType}:${email}`, "true", "EX", 10 * 60);

        res.status(200).json({
            success: true,
            message: "OTP verified successfully! You can now reset your password.",
        });
    } catch (error) {
        next(error);
    }
};

export const handleResetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
    userType: Role
) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            throw new ValidationError("Email and new password are required!");
        }

        const verifiedKey = `reset_verified:${userType}:${email}`;
        if (!(await redis.get(verifiedKey))) {
            throw new ValidationError("OTP verification required before resetting your password!");
        }

        const user = await findAccountByEmail(userType, email);
        if (!user) throw new ValidationError(`No ${userType} found with this email!`);

        // Prevent reusing the same password
        if (user.password && (await bcrypt.compare(newPassword, user.password))) {
            throw new ValidationError("New password cannot be the same as the old password!");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (userType === "seller") {
            await prisma.sellers.update({ where: { email }, data: { password: hashedPassword } });
        } else {
            await prisma.users.update({ where: { email }, data: { password: hashedPassword } });
        }

        await redis.del(verifiedKey); // single use

        res.status(200).json({
            success: true,
            message: "Password reset successfully!",
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // user first, so existing customer behaviour is unchanged
        const role = (["user", "seller", "admin"] as Role[]).find(
            (r) => req.cookies?.[TOKEN_COOKIES[r].refresh]
        );

        if (!role) {
            throw new ValidationError("Refresh token not found! Please log in again.");
        }

        const decoded = jwt.verify(
            req.cookies[TOKEN_COOKIES[role].refresh],
            process.env.REFRESH_TOKEN_SECRET as string
        ) as { id: string; role?: string };

        if (!decoded?.id || decoded.role !== role) {
            throw new ValidationError("Invalid refresh token! Please log in again.");
        }

        const account =
            role === "seller"
                ? await prisma.sellers.findUnique({ where: { id: decoded.id } })
                : await prisma.users.findUnique({ where: { id: decoded.id } });

        if (!account) {
            throw new ValidationError("Account not found! Please log in again.");
        }

        if (role === "admin" && (account as any).role !== "admin") {
            throw new ValidationError("Invalid access!");
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, role },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        setCookie(res, TOKEN_COOKIES[role].access, newAccessToken);

        res.status(200).json({
            success: true,
            message: "Access token refreshed successfully!",
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return next(new ValidationError("Invalid or expired refresh token! Please log in again."));
        }
        next(error);
    }
};