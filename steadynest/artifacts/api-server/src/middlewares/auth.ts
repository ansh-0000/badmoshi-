import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

// No fallback. This previously read
//   process.env.JWT_ACCESS_SECRET || "access_secret_dev"
// which meant a deploy with the variable unset happily verified tokens signed
// with a string published in a public repository - anyone could mint a valid
// token for any user. env.ts now refuses to boot without a real secret.
const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;

/**
 * Express middleware that enforces JWT authentication.
 * Extracts the token from the Authorization header (Bearer <token>).
 * On success, attaches `req.userId`, `req.userRole`, `req.userEmail` to the request.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Please provide a valid Bearer token." });
    return;
  }

  const token = auth.slice(7);

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as any;

    // Attach user info to request for downstream handlers
    (req as any).userId = payload.sub;
    (req as any).userRole = payload.role;
    (req as any).userEmail = payload.email;

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token. Please sign in again." });
  }
}

/**
 * Middleware that requires the user to have a specific role.
 * Must be used AFTER requireAuth.
 */
export function requireRole(role: "tenant" | "landlord") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;
    if (userRole !== role) {
      res.status(403).json({ error: `Access denied. This endpoint requires '${role}' role.` });
      return;
    }
    next();
  };
}
