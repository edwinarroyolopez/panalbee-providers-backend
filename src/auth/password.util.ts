import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_KEY_LEN = 64;

export function buildPasswordHash(password: string): {
  passwordHash: string;
  passwordSalt: string;
} {
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync(password, passwordSalt, SCRYPT_KEY_LEN).toString(
    'hex',
  );
  return { passwordHash, passwordSalt };
}

export function verifyPassword(
  password: string,
  passwordSalt: string,
  expectedHash: string,
): boolean {
  const calculated = scryptSync(password, passwordSalt, SCRYPT_KEY_LEN);
  const expected = Buffer.from(expectedHash, 'hex');

  if (expected.length !== calculated.length) {
    return false;
  }

  return timingSafeEqual(calculated, expected);
}
