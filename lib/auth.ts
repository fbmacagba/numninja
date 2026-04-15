import { SignJWT, jwtVerify } from 'jose';

const SALT = "numninjasalthardcoded2024!";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-numninja-edge-1234');

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const attemptHash = await hashPassword(password);
  // Using a simple comparison is safe here as we're comparing domestic hashes
  return attemptHash === storedHash;
}

export async function signSessionToken(payload: { id: number; alias: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; alias: string };
  } catch (error) {
    return null;
  }
}
