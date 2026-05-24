import * as jose from "jose";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "allo_health_super_secret_session_jwt_key_12345!"
);

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

/**
 * Encodes user session data into a JWT string.
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  const jwt = await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET_KEY);
  return jwt;
}

/**
 * Decodes and verifies a JWT string, returning the payload.
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Reads the session token from a NextRequest cookie and verifies it.
 */
export async function getUserFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const cookie = req.cookies.get("auth_token");
  if (!cookie) return null;
  return verifyJWT(cookie.value);
}

/**
 * Compare plain text password to hashed password.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a plain text password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
