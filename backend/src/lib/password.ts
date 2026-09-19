import bcrypt from "bcryptjs";

/**
 * Password hashing — bcrypt (10 rounds). Hashes are never sent to clients and
 * plaintext passwords are never stored or logged.
 */

const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
