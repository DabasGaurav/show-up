import { MIN_PASSWORD } from "@/lib/password-rules";

// What counts as a usable name, email and password. Used by every sign-up form.

export const MAX_NAME = 80;
export const MAX_EMAIL = 254;

/** One @, no spaces, a dot in the domain, and not absurdly long. */
export const isEmail = (e: string) => e.length <= MAX_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/** Null if the name is fine, otherwise what to tell the person. */
export function nameProblem(name: string): string | null {
  if (name.length < 2) return "Please add your name.";
  if (name.length > MAX_NAME) return `That name is too long. Keep it under ${MAX_NAME} characters.`;
  return null;
}

export const MAX_PASSWORD = 200;

/** Null if the password is fine, otherwise what to tell the person. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Choose a password with at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `That password is too long. Keep it under ${MAX_PASSWORD} characters.`;
  if (password.trim().length < MIN_PASSWORD) return "A password can't be mostly spaces.";
  return null;
}
