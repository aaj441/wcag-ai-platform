/**
 * Data Encryption Utilities
 * AES-256-GCM encryption for sensitive data at rest
 * Compliant with GDPR, HIPAA, and SOC 2 requirements
 */

import crypto from 'crypto';

/**
 * Encryption Configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Get encryption key from environment
 * In production, use AWS KMS, Google Cloud KMS, or HashiCorp Vault
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;

  if (!keyString) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  // Derive key from secret using PBKDF2
  const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'wcagai-encryption-salt-v1');
  return crypto.pbkdf2Sync(keyString, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data
 * Returns base64-encoded string: iv:encrypted:authTag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:encrypted:authTag (all hex-encoded)
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    return '';
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const [ivHex, encryptedHex, authTagHex] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 * Use for passwords, API keys that don't need to be retrieved
 */
export function hash(value: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(value, actualSalt, ITERATIONS, KEY_LENGTH, 'sha512');

  return `${actualSalt}:${hash.toString('hex')}`;
}

/**
 * Verify hashed value
 */
export function verifyHash(value: string, hashedValue: string): boolean {
  const [salt] = hashedValue.split(':');
  const newHash = hash(value, salt);
  return newHash === hashedValue;
}

/**
 * Encrypt object fields
 * Selectively encrypts specified fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: Array<keyof T>
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as any;
    }
  }

  return result;
}

/**
 * Decrypt object fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: Array<keyof T>
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string) as any;
      } catch (error) {
        console.error(`Failed to decrypt field ${String(field)}:`, error);
        // Leave encrypted if decryption fails
      }
    }
  }

  return result;
}

/**
 * Prisma Middleware for Automatic Encryption
 * Automatically encrypts/decrypts specified fields
 */
export function createEncryptionMiddleware(config: {
  model: string;
  fields: string[];
}) {
  return async (params: any, next: any) => {
    // Encrypt before create/update
    if (
      params.model === config.model &&
      (params.action === 'create' || params.action === 'update')
    ) {
      if (params.args.data) {
        for (const field of config.fields) {
          if (params.args.data[field]) {
            params.args.data[field] = encrypt(params.args.data[field]);
          }
        }
      }
    }

    const result = await next(params);

    // Decrypt after query
    if (
      params.model === config.model &&
      (params.action === 'findUnique' ||
        params.action === 'findFirst' ||
        params.action === 'findMany')
    ) {
      const decryptResult = (item: any) => {
        if (!item) return item;

        for (const field of config.fields) {
          if (item[field]) {
            try {
              item[field] = decrypt(item[field]);
            } catch (error) {
              console.error(`Failed to decrypt ${field}:`, error);
            }
          }
        }

        return item;
      };

      if (Array.isArray(result)) {
        return result.map(decryptResult);
      } else {
        return decryptResult(result);
      }
    }

    return result;
  };
}

/**
 * Mask sensitive data for logging
 * Shows only first/last few characters
 */
export function maskSensitive(value: string, showChars: number = 4): string {
  if (!value || value.length <= showChars * 2) {
    return '****';
  }

  const start = value.slice(0, showChars);
  const end = value.slice(-showChars);
  const masked = '*'.repeat(Math.max(value.length - showChars * 2, 4));

  return `${start}${masked}${end}`;
}

/**
 * Redact PII from objects for logging
 */
export function redactPII<T extends Record<string, any>>(obj: T): T {
  const piiFields = [
    'email',
    'phone',
    'ssn',
    'password',
    'apiKey',
    'token',
    'secret',
    'creditCard',
    'address',
    'firstName',
    'lastName',
    'name'
  ];

  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains PII field name
    if (piiFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (typeof result[key] === 'string') {
        result[key] = maskSensitive(result[key]) as any;
      } else {
        result[key] = '[REDACTED]' as any;
      }
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = redactPII(result[key]);
    }
  }

  return result;
}

/**
 * Generate secure API key
 */
export function generateAPIKey(prefix: string = 'wcag'): string {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Constant-time string comparison
 * Prevents timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Key rotation utilities
 */
export class KeyRotation {
  /**
   * Re-encrypt data with new key
   */
  static async rotateEncryptedField(
    oldCiphertext: string,
    oldKey: string,
    newKey: string
  ): Promise<string> {
    // Decrypt with old key
    const oldKeyBuffer = crypto.pbkdf2Sync(
      oldKey,
      Buffer.from(process.env.ENCRYPTION_SALT || 'wcagai-encryption-salt-v1'),
      ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    const parts = oldCiphertext.split(':');
    const [ivHex, encryptedHex, authTagHex] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, oldKeyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    // Re-encrypt with new key
    const newKeyBuffer = crypto.pbkdf2Sync(
      newKey,
      Buffer.from(process.env.ENCRYPTION_SALT || 'wcagai-encryption-salt-v1'),
      ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    const newIv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, newKeyBuffer, newIv);

    let newEncrypted = cipher.update(decrypted, 'utf8', 'hex');
    newEncrypted += cipher.final('hex');

    const newAuthTag = cipher.getAuthTag();

    return `${newIv.toString('hex')}:${newEncrypted}:${newAuthTag.toString('hex')}`;
  }
}

/**
 * Example: Prisma setup with encryption middleware
 */
export function setupEncryption(prisma: any) {
  // Encrypt consultant emails
  prisma.$use(
    createEncryptionMiddleware({
      model: 'Consultant',
      fields: ['email', 'phone']
    })
  );

  // Encrypt API keys
  prisma.$use(
    createEncryptionMiddleware({
      model: 'ApiKey',
      fields: ['key']
    })
  );

  // Add more models as needed
}

export default {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  encryptFields,
  decryptFields,
  createEncryptionMiddleware,
  maskSensitive,
  redactPII,
  generateAPIKey,
  generateToken,
  constantTimeCompare,
  KeyRotation,
  setupEncryption
};
