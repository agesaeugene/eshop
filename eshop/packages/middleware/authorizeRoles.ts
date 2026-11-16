import { AuthError } from "@packages/error-handler";
import { NextFunction, Response } from "express";

type Role = "user" | "seller" | "admin";

// generic, fails closed if req.role is missing
export const authorizeRoles =
  (...roles: Role[]) =>
  (req: any, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return next(new AuthError(`Access denied: ${roles.join(" or ")} only`));
    }
    next();
  };

export const isSeller = authorizeRoles("seller");
export const isUser = authorizeRoles("user");
export const isAdmin = authorizeRoles("admin");