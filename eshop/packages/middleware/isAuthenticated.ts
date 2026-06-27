import prisma from "@packages/libs/prisma";
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

const isAuthenticated = async (req: any, res: Response, next: NextFunction) => {
    try {
        // Support both user and seller cookies, plus Authorization header
        const token =
            req.cookies?.["seller-access-token"] ||
            req.cookies?.access_token ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized: Token missing" });
        }

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET as string
        ) as { id: string; role?: "user" | "seller" };

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }

        if (decoded.role === "seller") {
            const seller = await prisma.sellers.findUnique({ where: { id: decoded.id } });
            if (!seller) {
                return res.status(401).json({ message: "Unauthorized: Seller account not found" });
            }
            req.seller = seller;
            req.user = seller; // keep req.user populated too for generic middleware
        } else if (decoded.role === "user" || !decoded.role) {
            // FIX: explicit check instead of bare else, so future roles don't silently fall through as "user"
            const user = await prisma.users.findUnique({ where: { id: decoded.id } });
            if (!user) {
                return res.status(401).json({ message: "Unauthorized: User account not found" });
            }
            req.user = user;
        }

        return next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Token expired or invalid." });
    }
};

export default isAuthenticated;