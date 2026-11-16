import prisma from "@packages/libs/prisma";
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

export type Role = "user" | "seller" | "admin";

// one access-token cookie per role (matches what the login controllers set)
const ACCESS_COOKIE: Record<Role, string> = {
  user: "access_token",
  seller: "seller-access-token",
  admin: "admin-access-token",
};

type TokenPayload = { id: string; role?: Role };

const unauthorized = (res: Response, message = "Unauthorized") =>
  res.status(401).json({ message });

const getBearerToken = (header?: string): string | undefined => {
  if (!header) return undefined;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : undefined;
};

/**
 * Builds an auth middleware that only accepts the given roles.
 * It only reads the cookies belonging to those roles, so an admin
 * route never falls back to a customer or seller token.
 */
export const createAuthMiddleware =
  (allowedRoles: Role[]) =>
  async (req: any, res: Response, next: NextFunction) => {
    try {
      // 1. find the token (cookies in the order of allowedRoles, then Bearer header)
      let token: string | undefined;
      let cookieRole: Role | undefined;

      for (const role of allowedRoles) {
        const value = req.cookies?.[ACCESS_COOKIE[role]];
        if (value) {
          token = value;
          cookieRole = role;
          break;
        }
      }
      if (!token) token = getBearerToken(req.headers.authorization);
      if (!token) return unauthorized(res, "Unauthorized: Token missing");

      // 2. verify signature + expiry (algorithm pinned)
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, {
        algorithms: ["HS256"],
      }) as TokenPayload;

      if (!decoded?.id || !decoded.role) {
        return unauthorized(res, "Unauthorized: Invalid token");
      }

      // 3. role must be allowed, and must match the cookie it came from
      if (!allowedRoles.includes(decoded.role)) {
        return unauthorized(res, "Unauthorized: Invalid token");
      }
      if (cookieRole && decoded.role !== cookieRole) {
        return unauthorized(res, "Unauthorized: Invalid token");
      }

      // 4. load the account from the DB and re-check the role there
      switch (decoded.role) {
        case "seller": {
          const seller = await prisma.sellers.findUnique({
            where: { id: decoded.id },
            include: { shop: true },
          });
          if (!seller) return unauthorized(res, "Unauthorized: Account not found");

          const { password, ...safeSeller } = seller;
          req.seller = safeSeller;
          req.user = safeSeller;
          req.role = "seller";
          break;
        }

        case "admin": {
          const admin = await prisma.users.findUnique({ where: { id: decoded.id } });
          if (!admin || admin.role !== "admin") {
            return unauthorized(res, "Unauthorized: Account not found");
          }

          const { password, ...safeAdmin } = admin;
          req.admin = safeAdmin;
          req.user = safeAdmin;
          req.role = "admin";
          break;
        }

        case "user": {
          const user = await prisma.users.findUnique({ where: { id: decoded.id } });
          if (!user) return unauthorized(res, "Unauthorized: Account not found");

          const { password, ...safeUser } = user;
          req.user = safeUser;
          req.role = "user";
          break;
        }

        default:
          // unknown role: fail closed
          return unauthorized(res, "Unauthorized: Invalid token");
      }

      return next();
    } catch (error) {
      return unauthorized(res, "Unauthorized: Token expired or invalid");
    }
  };

// existing behaviour: customers and sellers (admins are NOT accepted here)
const isAuthenticated = createAuthMiddleware(["seller", "user"]);

// admin-only: reads only the admin cookie
export const isAdminAuthenticated = createAuthMiddleware(["admin"]);

export default isAuthenticated;