import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Passwords are never stored. We keep a salted scrypt hash and compare against that.

export const MIN_PASSWORD = 8;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64url")}$${scryptSync(password, salt, 32).toString("base64url")}`;
}

export function checkPassword(password: string, stored: string | null | undefined): boolean {
  const [kind, salt, hash] = (stored ?? "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = scryptSync(password, Buffer.from(salt, "base64url"), want.length);
  return timingSafeEqual(want, got);
}
