import crypto from "crypto"
import { ValidationError } from "@packages/error-handler";
import redis from "@packages/libs/redis";
import { sendEmail } from "./sendMail";
import { Request, Response, NextFunction } from "express";
import prisma from "@packages/libs/prisma";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export const validateRegistrationData = (data: any, userType: "user" | "seller") => {
    const { name, email, password, phone_number, country } = data;

    if (
        !name || !email || !password || (userType === "seller" && (!phone_number || !country))
    ) {
        throw new ValidationError('Missing required fields!');
    }

    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid email format!");
    }
};

export const checkOtpRestrictions = async (
    email: string,
    next: NextFunction
): Promise<boolean> => {
    if (await redis.get(`otp_lock:${email}`)) {
        next(new ValidationError("Account locked due to multiple failed attempts! Try again after 30 minutes."));
        return true;
    }
    if (await redis.get(`otp_spam_lock:${email}`)) {
        next(new ValidationError("Too many OTP requests! Please wait 1 hour and try again."));
        return true;
    }
    if (await redis.get(`otp_cooldown:${email}`)) {
        next(new ValidationError("Please wait a minute before requesting a new OTP again!"));
        return true;
    }
    return false;
};

export const trackOtpRequests = async (
    email: string,
    next: NextFunction
): Promise<boolean> => {
    const otpRequestKey = `otp_requests_count:${email}`;
    const otpRequests = parseInt((await redis.get(otpRequestKey)) || '0');

    if (otpRequests >= 2) {
        await redis.set(`otp_spam_lock:${email}`, 'locked', 'EX', 60 * 60);
        next(new ValidationError("Too many OTP requests! Please wait 1 hour and try again."));
        return true;
    }

    await redis.set(otpRequestKey, otpRequests + 1, 'EX', 60 * 60);
    return false;
};

export const sendOtp = async (name: string, email: string, template: string) => {
    const otp = crypto.randomInt(1000, 9999).toString();
    await redis.set(`otp:${email}`, otp, 'EX', 5 * 60);
    await redis.set(`otp_cooldown:${email}`, 'true', 'EX', 60);
    console.log(`[DEBUG] OTP stored for ${email}: "${otp}" | Redis key: "otp:${email}"`);
    await sendEmail(email, "Verify Your Email", template, { name, otp });
};

export const verifyOtp = async (
    email: string,
    otp: string,
    next: NextFunction
): Promise<boolean> => {
    const redisKey = `otp:${email}`;
    const storedOtp = await redis.get(redisKey);
    console.log(`[DEBUG] Verifying OTP for ${email} | Redis key: "${redisKey}" | Stored: "${storedOtp}" | Submitted: "${otp}"`);

    if (!storedOtp) {
        next(new ValidationError("OTP expired! Please request a new one."));
        return false;
    }

    const failedAttemptsKey = `otp_failed_attempts:${email}`;
    const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || '0');

    if (storedOtp !== otp) {
        if (failedAttempts >= 2) {
            await redis.set(`otp_lock:${email}`, 'locked', 'EX', 30 * 60);
            await redis.del(`otp:${email}`, failedAttemptsKey);
            next(new ValidationError("Account locked due to multiple failed attempts! Try again after 30 minutes."));
            return false;
        }

        await redis.set(failedAttemptsKey, failedAttempts + 1, 'EX', 30 * 60);
        next(new ValidationError(`Invalid OTP! You have ${2 - failedAttempts} attempts left before your account gets locked.`));
        return false;
    }

    await redis.del(`otp:${email}`, failedAttemptsKey);
    return true;
};

export const handleForgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
    userType: "user" | "seller"
) => {
    try {
        const { email } = req.body;

        if (!email) throw new ValidationError("Email is required!");

        // Find user/seller in DB
        const user =
            userType === "user"
                ? await prisma.users.findUnique({ where: { email } })
                : await prisma.seller.findUnique({ where: { email } }); 

        if (!user) throw new ValidationError(`No ${userType} found with this email!`);

        // Check OTP restrictions - stop execution if restricted
        const isRestricted = await checkOtpRestrictions(email, next);
        if (isRestricted) return;

        // Track OTP requests - stop execution if spam limit hit
        const isSpamBlocked = await trackOtpRequests(email, next);
        if (isSpamBlocked) return;

        // Send OTP to email
        const template =
            userType === "user"
                ? "user-forgot-password-mail"
                : "seller-forgot-password-mail";

        await sendOtp(user.name, email, template);

        res.status(200).json({
            message: "OTP sent to email for password reset. Please verify your account!",
        });

    } catch (error) {
        next(error);
    }
};