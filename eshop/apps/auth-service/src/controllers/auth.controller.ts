import { NextFunction, Request, Response } from 'express';
import {
    checkOtpRestrictions, handleForgotPassword, sendOtp, trackOtpRequests, validateRegistrationData, verifyOtp, verifyForgotPasswordOtp, handleResetPassword,
    refreshToken as refreshTokenHelper,
} from '../utils/auth.helper';
import prisma from '@packages/libs/prisma';
import { AuthError, NotFoundError, ValidationError } from '@packages/error-handler';
import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';
import redis from '@packages/libs/redis';
import { sendLog } from "../utils/send-log";

type TrackedRole = "user" | "seller" | "admin";

const recordAccountActivity = async (
    ownerId: string,
    role: TrackedRole,
    action: "login" | "heartbeat" | "logout"
) => {
    const now = new Date();
    const data = action === "login"
        ? { isOnline: true, lastLoginAt: now, lastSeenAt: now, lastLogoutAt: null }
        : action === "heartbeat"
            ? { isOnline: true, lastSeenAt: now }
            : { isOnline: false, lastSeenAt: now, lastLogoutAt: now };
    await prisma.accountActivity.upsert({
        where: { role_ownerId: { role, ownerId } },
        create: { ownerId, role, ...data },
        update: data,
    });
};

const recordLogoutFromCookie = async (
    req: Request,
    cookieName: string,
    role: TrackedRole
) => {
    const token = req.cookies?.[cookieName];
    if (!token) return;
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, {
            algorithms: ["HS256"],
            ignoreExpiration: true,
        }) as { id?: string; role?: string };
        if (decoded.id && decoded.role === role) {
            await recordAccountActivity(decoded.id, role, "logout");
        }
    } catch {
        // Expired or malformed tokens cannot identify an account to mark offline.
    }
};

const clearAuthCookie = (res: Response, cookieName: string) =>
    res.clearCookie(cookieName, { httpOnly: true, secure: true, sameSite: "none" });




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

        const isMatch = await bcrypt.compare(password, user.password!);
        if (!isMatch) {
            return next(new AuthError("Invalid email or password!"));
        }
        if (user.role === "admin") return next(new AuthError("Please sign in through the admin portal."));

        res.clearCookie("seller-access-token");
        res.clearCookie("seller-refresh-token");
        res.clearCookie("admin-access-token");
        res.clearCookie("admin-refresh-token");

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
        await recordAccountActivity(user.id, "user", "login");

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

export const refreshToken = async (req: any, res: Response, next: NextFunction) => {
    try {
        const token =
            req.cookies["refresh_token"] ||
            req.cookies["seller-refresh-token"] ||
            req.cookies["admin-refresh-token"] ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            throw new ValidationError("Refresh token not found! Please log in again.");
        }

        const decoded = jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET as string
        ) as { id: string; role?: string };

        if (!decoded?.id || !decoded.role) {
            throw new JsonWebTokenError("Forbidden! Invalid refresh token! Please log in again.");
        }

        let account: any = null;

        if (decoded.role === "user") {
            account = await prisma.users.findUnique({ where: { id: decoded.id } });
        } else if (decoded.role === "seller") {
            account = await prisma.sellers.findUnique({
                where: { id: decoded.id },
                include: { shop: true },
            });
        } else if (decoded.role === "admin") {
            account = await prisma.users.findUnique({ where: { id: decoded.id } });
            if (account && account.role !== "admin") account = null;
        }

        if (!account) {
            throw new AuthError("User not found! Please log in again.");
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        if (decoded.role === "user") setCookie(res, "access_token", newAccessToken);
        else if (decoded.role === "seller") setCookie(res, "seller-access-token", newAccessToken);
        else if (decoded.role === "admin") setCookie(res, "admin-access-token", newAccessToken);

        req.role = decoded.role;

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

        await redis.set(`reset_verified:user:${email}`, "true", "EX", 10 * 60);

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

        const verifiedKey = `reset_verified:user:${email}`;
        if (!(await redis.get(verifiedKey))) {
            return next(new ValidationError("OTP verification required before resetting your password!"));
        }

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) return next(new ValidationError("No user found with this email!"));

        if (user.password && (await bcrypt.compare(newPassword, user.password))) {
            return next(new ValidationError("New password cannot be the same as the old password!"));
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.users.update({
            where: { email },
            data: { password: hashedPassword }
        });

        await redis.del(verifiedKey);

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

        const isMatch = await bcrypt.compare(password, seller.password!);
        if (!isMatch)
            return next(new ValidationError("Invalid Email or Password"));

        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.clearCookie("admin-access-token");
        res.clearCookie("admin-refresh-token");

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
        await recordAccountActivity(seller.id, "seller", "login");

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

// get shop
export const getShopById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const shop = await prisma.shops.findUnique({
            where: { id: req.params.id },
            // include: { avatar: true, coverBanner: true }, // only if these are relations in your schema
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        // Replace with a real count if your schema has followers
        const followersCount = 0;

        res.status(200).json({ success: true, shop, followersCount });
    } catch (error) {
        next(error);
    }
};

// add new address
export const addUserAddress = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    const userId = req.user?.id;

    try {
        const { label, name, city, zip, country } = req.body;
        const street = req.body.street ?? req.body.Street;
        const validLabels = ["Home", "Work", "Other"];
        if (
            !userId ||
            !validLabels.includes(label) ||
            ![name, street, city, zip, country].every((value) => typeof value === "string" && value.trim())
        ) {
            return next(new ValidationError("Enter a valid address label, recipient name, street, city, ZIP code, and country."));
        }
        const wantsDefault = req.body.isDefault === true || req.body.isDefault === "true";
        const existingAddressCount = await prisma.address.count({ where: { userId } });
        const makeDefault = wantsDefault || existingAddressCount === 0;
        const newAddress = await prisma.address.create({
            data: {
                userId,
                label,
                name: name.trim(),
                street: street.trim(),
                city: city.trim(),
                zip: zip.trim(),
                country: country.trim(),
                isDefault: makeDefault,
            },
        });
        if (makeDefault) {
            await prisma.address.updateMany({
                where: { userId, id: { not: newAddress.id }, isDefault: true },
                data: { isDefault: false },
            });
        }

        return res.status(201).json({
            success: true,
            address: newAddress,
        });
    } catch (error) {
        return next(error);
    }

};

// delete user address
export const deleteUserAddress = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id;
        const { addressId } = req.params;

        if (!addressId || !userId) {
            return next(new ValidationError("Address ID is required"));
        }

        const existingAddress = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId,
            },
        });

        if (!existingAddress) {
            return next(new NotFoundError("address not found or unauthorized"));
        }

        await prisma.address.delete({
            where: { id: addressId },
        });
        if (existingAddress.isDefault) {
            const nextDefault = await prisma.address.findFirst({
                where: { userId },
                orderBy: { createdAt: "desc" },
                select: { id: true },
            });
            if (nextDefault) {
                await prisma.address.update({
                    where: { id: nextDefault.id },
                    data: { isDefault: true },
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Address deleted successfully",
        });

    } catch (error) {
        return next(error);
    }
}

// get user addresses
export const getUserAddresses = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id;
        if (!userId) return next(new AuthError("You must be signed in to view your addresses."));

        const addresses = await prisma.address.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });


        res.status(200).json({
            success: true,
            addresses,
        })
    } catch (error) {
        next(error);

    }
}

// Change password (authenticated user, not the forgot-password OTP flow)
// export const changeUserPassword = async (
//     req: any,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const userId = req.user?.id;
//         const { currentPassword, newPassword, confirmPassword } = req.body;

//         if (!currentPassword || !newPassword || !confirmPassword) {
//             return next(new ValidationError("All fields are required!"));
//         }

//         if (newPassword !== confirmPassword) {
//             return next(new ValidationError("New password and confirm password do not match!"));
//         }

//         if (newPassword.length < 8) {
//             return next(new ValidationError("New password must be at least 8 characters!"));
//         }

//         const user = await prisma.users.findUnique({ where: { id: userId } });
//         if (!user || !user.password) {
//             return next(new AuthError("User not found!"));
//         }

//         const isMatch = await bcrypt.compare(currentPassword, user.password);
//         if (!isMatch) {
//             return next(new AuthError("Current password is incorrect!"));
//         }

//         const isSamePassword = await bcrypt.compare(newPassword, user.password);
//         if (isSamePassword) {
//             return next(new ValidationError("New password cannot be the same as the current password!"));
//         }

//         const hashedPassword = await bcrypt.hash(newPassword, 10);

//         await prisma.users.update({
//             where: { id: userId },
//             data: { password: hashedPassword },
//         });

//         res.status(200).json({
//             success: true,
//             message: "Password changed successfully!",
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// shared checks for both steps of the change-password flow
const validatePasswordChange = async (userId: string, body: any) => {
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new ValidationError("All fields are required!");
    }
    if (newPassword !== confirmPassword) {
        throw new ValidationError("New password and confirm password do not match!");
    }
    if (newPassword.length < 8) {
        throw new ValidationError("New password must be at least 8 characters!");
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
        throw new AuthError("User not found!");
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
        throw new AuthError("Current password is incorrect!");
    }
    if (await bcrypt.compare(newPassword, user.password)) {
        throw new ValidationError("New password cannot be the same as the current password!");
    }

    return user;
};

// Step 1: validate the passwords, then email an OTP
export const sendChangePasswordOtp = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await validatePasswordChange(req.user?.id, req.body);

        const isRestricted = await checkOtpRestrictions(user.email, next, "user");
        if (isRestricted) return;

        const isSpamBlocked = await trackOtpRequests(user.email, next, "user");
        if (isSpamBlocked) return;

        await sendOtp(user.name, user.email, "user-change-password-mail", "user");

        res.status(200).json({
            success: true,
            message: "Verification code sent to your email.",
        });
    } catch (error) {
        next(error);
    }
};

// Step 2: verify the OTP, then change the password
export const changeUserPassword = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.id;
        const { newPassword, otp } = req.body;

        const user = await validatePasswordChange(userId, req.body);

        if (!otp) {
            return next(new ValidationError("Verification code is required!"));
        }

        const otpValid = await verifyOtp(user.email, otp, next, "user");
        if (!otpValid) return;

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.users.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({
            success: true,
            message: "Password changed successfully!",
        });
    } catch (error) {
        next(error);
    }
};

// Logout user: clear only the customer cookies
export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await recordLogoutFromCookie(req, "access_token", "user");
        clearAuthCookie(res, "access_token");
        clearAuthCookie(res, "refresh_token");

        res.status(200).json({
            success: true,
            message: "Logged out successfully!",
        });
    } catch (error) {
        next(error);
    }
};

// login admin
export const loginAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ValidationError("Email and password are required!"));
        }

        const user = await prisma.users.findUnique({ where: { email } });

        // same message for "no user" and "wrong password"
        if (!user || !user.password) {
            return next(new AuthError("Invalid email or password"));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(new AuthError("Invalid email or password"));
        }

        if (user.role !== "admin") {
            sendLog({
                type: "error",
                message: `Admin login failed for ${email} - not an admin`,
                source: "auth-service",
            });
            return next(new AuthError("Invalid access!"));
        }

        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.clearCookie("seller-access-token");
        res.clearCookie("seller-refresh-token");

        const accessToken = jwt.sign(
            { id: user.id, role: "admin" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { id: user.id, role: "admin" },
            process.env.REFRESH_TOKEN_SECRET as string,
            { expiresIn: "7d" }
        );

        setCookie(res, "admin-refresh-token", refreshToken);
        setCookie(res, "admin-access-token", accessToken);
        await recordAccountActivity(user.id, "admin", "login");

        sendLog({
            type: "success",
            message: `Admin login successful: ${email}`,
            source: "auth-service",
        });

        return res.status(200).json({
            message: "Login successful!",
            user: { id: user.id, email: user.email, name: user.name },
        });
    } catch (error) {
        return next(error);
    }
};

// admin authentication
export const isAdminAuthenticated = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const token =
            req.cookies?.["admin-access-token"] ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return next(new AuthError("Unauthorized! Token missing."));
        }

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET as string
        ) as { id: string; role: string };

        if (!decoded?.id || decoded.role !== "admin") {
            return next(new AuthError("Unauthorized! Invalid token."));
        }

        const admin = await prisma.users.findUnique({
            where: { id: decoded.id },
        });

        if (!admin || admin.role !== "admin") {
            return next(new AuthError("Unauthorized! Admin not found."));
        }

        req.admin = admin;
        return next();
    } catch (error) {
        // expired or malformed token
        return next(new AuthError("Unauthorized! Invalid or expired token."));
    }
};

// Get the logged-in admin
export const getAdmin = async (
    req: any,
    res: Response,
    next: NextFunction
) => {
    try {
        const { password, ...admin } = req.admin;
        res.status(200).json({
            success: true,
            user: admin,
        });
    } catch (error) {
        next(error);
    }
};

// Refresh admin token
export const refreshAdminToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies?.["admin-refresh-token"];

        if (!token) {
            throw new ValidationError("Refresh token not found! Please log in again.");
        }

        const decoded = jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET as string
        ) as { id: string; role?: string };

        if (!decoded?.id || decoded.role !== "admin") {
            throw new JsonWebTokenError("Forbidden! Invalid refresh token!");
        }

        const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!admin || admin.role !== "admin") {
            throw new AuthError("Admin not found! Please log in again.");
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, role: "admin" },
            process.env.ACCESS_TOKEN_SECRET as string,
            { expiresIn: "15m" }
        );

        setCookie(res, "admin-access-token", newAccessToken);

        res.status(200).json({
            success: true,
            message: "Admin access token refreshed successfully!",
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return next(new ValidationError("Invalid or expired refresh token! Please log in again."));
        }
        next(error);
    }
};

export const logoutAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await recordLogoutFromCookie(req, "admin-access-token", "admin");
        clearAuthCookie(res, "admin-access-token");
        clearAuthCookie(res, "admin-refresh-token");
        res.status(200).json({ success: true, message: "Logged out successfully!" });
    } catch (error) {
        next(error);
    }
};

export const logoutSeller = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await recordLogoutFromCookie(req, "seller-access-token", "seller");
        clearAuthCookie(res, "seller-access-token");
        clearAuthCookie(res, "seller-refresh-token");
        return res.status(200).json({ success: true, message: "Seller logged out successfully!" });
    } catch (error) {
        return next(error);
    }
};

export const heartbeatAccountActivity = async (req: any, res: Response, next: NextFunction) => {
    try {
        const role = req.role as TrackedRole;
        const accountId = role === "seller" ? req.seller.id : req.user.id;
        await recordAccountActivity(accountId, role, "heartbeat");
        return res.status(204).end();
    } catch (error) {
        return next(error);
    }
};


// // Get the logged-in user's orders
// export const getUserOrders = async (
//     req: any,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const userId = req.user?.id;

//         const orders = await prisma.orders.findMany({
//             where: { userId },
//             include: {
//                 items: true,
//                 shop: {
//                     select: { id: true, name: true },
//                 },
//             },
//             orderBy: { createdAt: "desc" },
//         });

//         res.status(200).json({
//             success: true,
//             orders,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // Get the logged-in user's notifications
// export const getUserNotifications = async (
//     req: any,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const userId = req.user?.id;

//         const notifications = await prisma.notifications.findMany({
//             where: { userId },
//             orderBy: { createdAt: "desc" },
//         });

//         res.status(200).json({
//             success: true,
//             notifications,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // Mark a single notification as read
// export const markNotificationRead = async (
//     req: any,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const userId = req.user?.id;
//         const { id } = req.params;

//         const notification = await prisma.notifications.findFirst({
//             where: { id, userId },
//         });

//         if (!notification) {
//             return next(new NotFoundError("Notification not found"));
//         }

//         await prisma.notifications.update({
//             where: { id },
//             data: { isRead: true },
//         });

//         res.status(200).json({ success: true });
//     } catch (error) {
//         next(error);
//     }
// };

// // Mark all notifications as read
// export const markAllNotificationsRead = async (
//     req: any,
//     res: Response,
//     next: NextFunction
// ) => {
//     try {
//         const userId = req.user?.id;

//         await prisma.notifications.updateMany({
//             where: { userId, isRead: false },
//             data: { isRead: true },
//         });

//         res.status(200).json({ success: true });
//     } catch (error) {
//         next(error);
//     }
// };