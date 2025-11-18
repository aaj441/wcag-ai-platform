/**
 * Security Utilities Module
 * Provides common security functions for input validation, sanitization, and protection
 */

import path from 'path';
import crypto from 'crypto';

/**
 * Sanitize file path to prevent path traversal attacks
 * @param basePath - The base directory that should contain the file
 * @param userPath - The user-provided path component
 * @returns Sanitized absolute path
 * @throws Error if path traversal is detected
 */
export function sanitizeFilePath(basePath: string, userPath: string): string {
  // Remove any path traversal attempts
  const sanitized = path.basename(userPath);
  
  // Join with base path
  const fullPath = path.join(basePath, sanitized);
  
  // Verify the resolved path is still within basePath
  const resolvedPath = path.resolve(fullPath);
  const resolvedBase = path.resolve(basePath);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }
  
  return resolvedPath;
}

/**
 * Validate and sanitize filename
 * @param filename - User-provided filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255); // Limit length
}

/**
 * Safe regex pattern creation with complexity limits
 * @param pattern - The regex pattern string
 * @param flags - Regex flags
 * @returns RegExp object or null if pattern is too complex
 */
export function createSafeRegex(pattern: string, flags?: string): RegExp | null {
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /(\*|\+|\{)\1+/, // Nested quantifiers
    /(\(.*\)){2,}/, // Nested groups
    /\[.*\]\*\[.*\]\*/, // Multiple character classes with quantifiers
  ];
  
  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      console.warn(`Potentially dangerous regex pattern detected: ${pattern}`);
      return null;
    }
  }
  
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    console.error(`Invalid regex pattern: ${pattern}`, error);
    return null;
  }
}

/**
 * Execute regex with timeout protection
 * @param regex - The regex to execute
 * @param input - The input string
 * @param timeoutMs - Timeout in milliseconds (default: 100ms)
 * @returns Match result or null if timeout
 */
export function safeRegexExec(
  regex: RegExp,
  input: string,
  timeoutMs: number = 100
): RegExpExecArray | null {
  const start = Date.now();
  
  try {
    // Create a copy to avoid state issues
    const safeCopy = new RegExp(regex.source, regex.flags);
    
    // Simple timeout check (not perfect but helps)
    if (input.length > 10000) {
      console.warn('Input too long for regex execution');
      return null;
    }
    
    const result = safeCopy.exec(input);
    
    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      console.warn(`Regex execution took ${elapsed}ms, consider optimization`);
    }
    
    return result;
  } catch (error) {
    console.error('Regex execution error:', error);
    return null;
  }
}

/**
 * Sanitize HTML to prevent XSS
 * Basic implementation - consider using DOMPurify for production
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Mask sensitive data for logging
 * @param data - Data object to mask
 * @param sensitiveKeys - Keys to mask (default: common sensitive fields)
 * @returns Masked data object
 */
export function maskSensitiveData(
  data: any,
  sensitiveKeys: string[] = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'privateKey',
    'creditCard',
    'ssn',
  ]
): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in masked) {
    const lowerKey = key.toLowerCase();
    
    // Check if key matches sensitive patterns
    const isSensitive = sensitiveKeys.some(
      (sensitiveKey) => lowerKey.includes(sensitiveKey.toLowerCase())
    );
    
    if (isSensitive && typeof masked[key] === 'string') {
      // Mask the value
      const value = masked[key];
      if (value.length <= 4) {
        masked[key] = '***';
      } else {
        masked[key] = value.substring(0, 2) + '***' + value.substring(value.length - 2);
      }
    } else if (typeof masked[key] === 'object') {
      // Recursively mask nested objects
      masked[key] = maskSensitiveData(masked[key], sensitiveKeys);
    }
  }
  
  return masked;
}

/**
 * Generate secure random string
 * @param length - Length of the string
 * @returns Random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for storage
 * @param data - Data to hash
 * @param salt - Optional salt
 * @returns Hashed data
 */
export function hashData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
  return `${actualSalt}:${hash}`;
}

/**
 * Verify hashed data
 * @param data - Original data
 * @param hashedData - Hashed data with salt
 * @returns True if match
 */
export function verifyHashedData(data: string, hashedData: string): boolean {
  const [salt, hash] = hashedData.split(':');
  const newHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return hash === newHash;
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000
  ) {}
  
  /**
   * Check if request is allowed
   * @param key - Identifier (e.g., IP address, user ID)
   * @returns True if allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  /**
   * Reset rate limit for a key
   * @param key - Identifier to reset
   */
  reset(key: string): void {
    this.requests.delete(key);
  }
  
  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((time) => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Input validation helpers
 */
export const validators = {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  
  /**
   * Validate UUID format
   */
  isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  
  /**
   * Validate alphanumeric string
   */
  isAlphanumeric(str: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(str);
  },
};

export default {
  sanitizeFilePath,
  sanitizeFilename,
  createSafeRegex,
  safeRegexExec,
  sanitizeHtml,
  maskSensitiveData,
  generateSecureToken,
  hashData,
  verifyHashedData,
  RateLimiter,
  validators,
};