import { vi } from "vitest";

// Server-only modules run outside a Next.js request in tests.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Map([["host", "test.local"]]),
}));
