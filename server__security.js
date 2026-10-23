// Cryptographically Secure Password & OTP Hashing Utilities
import crypto from 'node:crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

/**
 * Hashes a plaintext password using scrypt with a unique per-user salt.
 * Returns formatted string: "salt:hash"
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a candidate password against a stored "salt:hash" string using timing-safe comparison.
 */
export function verifyPassword(password, storedCombinedHash) {
  if (!password || !storedCombinedHash || !storedCombinedHash.includes(':')) {
    return false;
  }
  try {
    const [salt, originalHash] = storedCombinedHash.split(':');
    const originalBuffer = Buffer.from(originalHash, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
    return crypto.timingSafeEqual(originalBuffer, derivedKey);
  } catch (err) {
    return false;
  }
}

/**
 * Generates a 6-digit cryptographically secure numerical OTP.
 */
export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with a secret salt so plaintext OTP is never persisted in storage or database.
 */
export function hashOtp(otp, salt = 'MAGIZH_OTP_SECRET_SALT_2026') {
  return crypto.createHmac('sha256', salt).update(String(otp)).digest('hex');
}

/**
 * Timing-safe verification of candidate OTP against stored hash.
 */
export function verifyOtp(candidateOtp, storedOtpHash, salt = 'MAGIZH_OTP_SECRET_SALT_2026') {
  if (!candidateOtp || !storedOtpHash) return false;
  try {
    const candidateHash = hashOtp(candidateOtp, salt);
    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    const storedBuffer = Buffer.from(storedOtpHash, 'hex');
    if (candidateBuffer.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
  } catch (err) {
    return false;
  }
}
