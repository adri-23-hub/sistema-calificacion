// Incrementing this version invalidates sessions issued by previous releases.
export const SESSION_VERSION = 2;

export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32 ||
      /change-me|dev-secret|change-in-production/i.test(secret)) {
    throw new Error("AUTH_SECRET debe contener una clave aleatoria de al menos 32 bytes, sin valores de ejemplo.");
  }
  return new TextEncoder().encode(secret);
}
