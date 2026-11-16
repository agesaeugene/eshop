import { AuthError, ValidationError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";
import bcrypt from "bcryptjs";
import { NextFunction, Response } from "express";
import {
    checkOtpRestrictions,
    sendOtp,
    trackOtpRequests,
    verifyOtp,
} from "../utils/auth.helper";

const DEFAULT_NOTIFICATION_PREFERENCES = {
    orderUpdates: true,
    eventReviews: true,
    productUpdates: true,
    accountAlerts: true,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getSellerSettings = async (req: any, res: Response, next: NextFunction) => {
    try {
        const seller = await prisma.sellers.findUnique({
            where: { id: req.seller.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                country: true,
                phone_verified: true,
                notificationPreferences: true,
                shop: true,
            },
        });

        if (!seller) return res.status(404).json({ message: "Seller account not found" });

        return res.status(200).json({
            success: true,
            profile: {
                id: seller.id,
                name: seller.name,
                email: seller.email,
                phone_number: seller.phone_number,
                country: seller.country,
                phone_verified: seller.phone_verified,
            },
            shop: seller.shop,
            notificationPreferences: {
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...(seller.notificationPreferences as Record<string, boolean> | null),
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const updateSellerSettings = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { profile, shop, notificationPreferences } = req.body;
        const sellerId = req.seller.id;

        if (profile !== undefined) {
            if (
                !profile ||
                typeof profile.name !== "string" ||
                typeof profile.email !== "string" ||
                typeof profile.phone_number !== "string" ||
                typeof profile.country !== "string"
            ) {
                return next(new ValidationError("Enter a name, email, phone number, and country"));
            }
            const name = profile.name.trim();
            const email = profile.email.trim().toLowerCase();
            const phoneNumber = profile.phone_number.trim();
            const country = profile.country.trim();
            if (!name || !emailPattern.test(email) || !phoneNumber || !country) {
                return next(new ValidationError("Enter valid seller account details"));
            }
            const duplicate = await prisma.sellers.findFirst({
                where: { email, id: { not: sellerId } },
                select: { id: true },
            });
            if (duplicate) return next(new ValidationError("That email address is already in use"));

            await prisma.sellers.update({
                where: { id: sellerId },
                data: {
                    name,
                    email,
                    phone_number: phoneNumber,
                    country,
                    ...(phoneNumber !== req.seller.phone_number ? { phone_verified: false } : {}),
                },
            });
        }

        if (shop !== undefined) {
            const currentShop = await prisma.shops.findUnique({
                where: { sellerId },
                select: { id: true },
            });
            if (!currentShop) return next(new ValidationError("Create your shop before editing shop settings"));
            if (
                !shop ||
                typeof shop.name !== "string" ||
                typeof shop.bio !== "string" ||
                typeof shop.category !== "string" ||
                typeof shop.address !== "string" ||
                typeof shop.opening_hours !== "string" ||
                typeof shop.website !== "string" ||
                (shop.coverBanner !== undefined && typeof shop.coverBanner !== "string") ||
                !Array.isArray(shop.socialLinks)
            ) {
                return next(new ValidationError("Shop settings are incomplete or invalid"));
            }
            if (!shop.name.trim() || !shop.category.trim() || !shop.address.trim() || !shop.opening_hours.trim()) {
                return next(new ValidationError("Shop name, category, address, and opening hours are required"));
            }
            const socialLinks = shop.socialLinks
                .filter((link: any) => link && typeof link.type === "string" && typeof link.url === "string")
                .map((link: any) => ({ type: link.type.trim(), url: link.url.trim() }))
                .filter((link: { type: string; url: string }) => link.type && link.url);
            if (shop.socialLinks.length !== socialLinks.length) {
                return next(new ValidationError("Each social link must include a platform and URL"));
            }
            if (shop.website.trim() && !/^https?:\/\/\S+$/i.test(shop.website.trim())) {
                return next(new ValidationError("Shop website must start with http:// or https://"));
            }
            if (shop.coverBanner?.trim() && !/^https?:\/\/\S+$/i.test(shop.coverBanner.trim())) {
                return next(new ValidationError("Shop cover image must be a valid http:// or https:// URL"));
            }
            for (const link of socialLinks) {
                if (!/^https?:\/\/\S+$/i.test(link.url)) {
                    return next(new ValidationError("Social links must start with http:// or https://"));
                }
            }

            await prisma.shops.update({
                where: { id: currentShop.id },
                data: {
                    name: shop.name.trim(),
                    bio: shop.bio.trim(),
                    category: shop.category.trim(),
                    address: shop.address.trim(),
                    opening_hours: shop.opening_hours.trim(),
                    website: shop.website.trim(),
                    ...(shop.coverBanner !== undefined ? { coverBanner: shop.coverBanner.trim() || null } : {}),
                    socialLinks,
                },
            });
        }

        if (notificationPreferences !== undefined) {
            if (!notificationPreferences || typeof notificationPreferences !== "object" || Array.isArray(notificationPreferences)) {
                return next(new ValidationError("Notification preferences are invalid"));
            }
            const preferences = Object.fromEntries(
                Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => [
                    key,
                    notificationPreferences[key] === true,
                ])
            );
            await prisma.sellers.update({
                where: { id: sellerId },
                data: { notificationPreferences: preferences },
            });
        }

        return res.status(200).json({ success: true, message: "Seller settings saved" });
    } catch (error) {
        return next(error);
    }
};

const validateSellerPasswordChange = async (sellerId: string, body: any) => {
    const { currentPassword, newPassword, confirmPassword } = body;
    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new ValidationError("Current password, new password, and confirmation are required");
    }
    if (newPassword !== confirmPassword) {
        throw new ValidationError("New password and confirmation do not match");
    }
    if (newPassword.length < 8) {
        throw new ValidationError("New password must be at least 8 characters");
    }

    const seller = await prisma.sellers.findUnique({ where: { id: sellerId } });
    if (!seller) throw new AuthError("Seller account not found");
    if (!(await bcrypt.compare(currentPassword, seller.password))) {
        throw new AuthError("Current password is incorrect");
    }
    if (await bcrypt.compare(newPassword, seller.password)) {
        throw new ValidationError("New password cannot be the same as the current password");
    }
    return seller;
};

export const sendSellerPasswordChangeOtp = async (req: any, res: Response, next: NextFunction) => {
    try {
        const seller = await validateSellerPasswordChange(req.seller.id, req.body);
        if (await checkOtpRestrictions(seller.email, next, "seller")) return;
        if (await trackOtpRequests(seller.email, next, "seller")) return;

        await sendOtp(seller.name, seller.email, "seller-change-password-mail", "seller");
        return res.status(200).json({ success: true, message: "Verification code sent to your seller email." });
    } catch (error) {
        return next(error);
    }
};

export const changeSellerPassword = async (req: any, res: Response, next: NextFunction) => {
    try {
        const seller = await validateSellerPasswordChange(req.seller.id, req.body);
        if (!req.body.otp) return next(new ValidationError("Verification code is required"));
        if (!(await verifyOtp(seller.email, req.body.otp, next, "seller"))) return;

        await prisma.sellers.update({
            where: { id: seller.id },
            data: { password: await bcrypt.hash(req.body.newPassword, 10) },
        });
        return res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        return next(error);
    }
};
