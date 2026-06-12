import { NextFunction, Response } from "express";

export const isSeller = (req: any, res: Response, next: NextFunction) => {
    if (req.seller || req.user?.role === "seller") {
        return next();
    }
    return res.status(403).json({ message: "Forbidden: Seller access required" });
};

export const isUser = (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.role !== "seller") {
        return next();
    }
    return res.status(403).json({ message: "Forbidden: User access required" });
};