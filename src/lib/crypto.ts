import { createHash } from "crypto";

/**
 * Hash chain implementation per ARCHITECTURE.md §10.3
 *
 * payloadHash = SHA-256("v1|" + canonicalJSON(payload))
 * chainHash   = SHA-256(previousHash + "|" + payloadHash)
 */

export function canonicalJSON(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

export function computePayloadHash(payload: unknown): string {
  const data = `v1|${canonicalJSON(payload)}`;
  return createHash("sha256").update(data).digest("hex");
}

export function computeChainHash(previousHash: string, payloadHash: string): string {
  const data = `${previousHash}|${payloadHash}`;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Simple password hashing for development.
 * In production, replace with Argon2id (@node-rs/argon2).
 */
export async function hashPassword(password: string): Promise<string> {
  // Using SHA-256 with salt for development. Replace with argon2 in production.
  const salt = createHash("sha256")
    .update(Math.random().toString())
    .digest("hex")
    .slice(0, 16);
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return `sha256:${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts[0] === "sha256" && parts.length === 3) {
    const salt = parts[1];
    const hash = createHash("sha256")
      .update(salt + password)
      .digest("hex");
    return hash === parts[2];
  }
  return false;
}
