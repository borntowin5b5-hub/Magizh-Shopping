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

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'MAGIZH_ADMIN_HMAC_SECRET_2026';

/**
 * Generates an HMAC-signed Bearer token for authenticated administrators.
 */
export function generateAdminToken(userId, email) {
  const payload = `${userId}:${email}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * Validates an admin Bearer token using timing-safe signature comparison and expiration.
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return null;
    const [userId, email, timestampStr, signature] = parts;
    const payload = `${userId}:${email}:${timestampStr}`;
    const expectedSignature = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    // Valid for 24 hours
    const timestamp = parseInt(timestampStr, 10);
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return null;
    }

    return { userId, email, timestamp };
  } catch (err) {
    return null;
  }
}
