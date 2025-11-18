/**
 * Security Utilities
 *
 * Provides security-focused utility functions for:
 * - Path traversal prevention
 * - Input sanitization
 * - Safe file operations
 */

const path = require('path');

/**
 * Sanitize a filename/identifier to prevent path traversal attacks
 * Removes or replaces characters that could be used for directory traversal
 *
 * @param {string} input - The user input to sanitize
 * @returns {string} Sanitized filename/identifier
 * @throws {Error} If input is invalid
 */
function sanitizePath(input) {
  if (typeof input !== 'string') {
    throw new Error('Path input must be a string');
  }

  if (input.length === 0) {
    throw new Error('Path input cannot be empty');
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove path traversal sequences
  sanitized = sanitized.replace(/\.\.\//g, '');
  sanitized = sanitized.replace(/\.\.\\/g, '');
  sanitized = sanitized.replace(/^\.\./, '');

  // Allow only safe filename characters: alphanumeric, dash, underscore, dot
  // This is strict but safe for most use cases (IDs, filenames, etc.)
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_\.]/g, '-');

  // Remove leading/trailing dots (hidden files on Unix, reserved names on Windows)
  sanitized = sanitized.replace(/^\.+/, '').replace(/\.+$/, '');

  if (sanitized.length === 0) {
    throw new Error('Sanitization resulted in empty string');
  }

  return sanitized;
}

/**
 * Safely join path segments with traversal protection
 * Prevents construction of paths outside the base directory
 *
 * @param {string} baseDir - Base directory (should be absolute)
 * @param {string} userInput - User-provided path segment(s)
 * @returns {string} Safe joined path
 * @throws {Error} If the result path is outside baseDir
 */
function safePathJoin(baseDir, userInput) {
  if (!baseDir || typeof baseDir !== 'string') {
    throw new Error('baseDir must be a non-empty string');
  }

  if (!userInput || typeof userInput !== 'string') {
    throw new Error('userInput must be a non-empty string');
  }

  // Get absolute path of base directory
  const absoluteBase = path.resolve(baseDir);

  // Sanitize the user input
  const sanitized = sanitizePath(userInput);

  // Join paths
  const resultPath = path.resolve(absoluteBase, sanitized);

  // Verify result path is within base directory
  if (!resultPath.startsWith(absoluteBase + path.sep) && resultPath !== absoluteBase) {
    throw new Error(`Path traversal detected: ${userInput} attempts to escape base directory`);
  }

  return resultPath;
}

/**
 * Sanitize a filename ensuring it's just a filename (no directory components)
 *
 * @param {string} filename - The filename to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  // Use path.basename to remove any directory components
  let baseName = path.basename(filename);

  // Apply additional sanitization
  return sanitizePath(baseName);
}

/**
 * Validate that a path doesn't contain traversal sequences
 *
 * @param {string} inputPath - The path to validate
 * @returns {boolean} True if path is safe, false otherwise
 */
function isPathSafe(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.length === 0) {
    return false;
  }

  // Check for path traversal patterns
  const dangerousPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /^\.\.$/,
    /\0/,
    /\.\.\$/
  ];

  return !dangerousPatterns.some(pattern => pattern.test(inputPath));
}

/**
 * Escape user input for safe use in regular expressions
 * Prevents ReDoS attacks by escaping special regex characters
 *
 * @param {string} str - The string to escape
 * @returns {string} Escaped string safe for use in RegExp
 */
function escapeRegExp(str) {
  if (typeof str !== 'string') {
    return '';
  }

  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate input length to prevent denial of service
 *
 * @param {string} input - The input to validate
 * @param {number} maxLength - Maximum allowed length (default: 255)
 * @returns {boolean} True if input is within limits
 */
function validateInputLength(input, maxLength = 255) {
  if (typeof input !== 'string') {
    return false;
  }

  return input.length > 0 && input.length <= maxLength;
}

/**
 * Sanitize identifier (UUID, ID, etc.)
 * Only allows alphanumeric, dash, and underscore
 *
 * @param {string} identifier - The identifier to sanitize
 * @returns {string} Sanitized identifier
 */
function sanitizeIdentifier(identifier) {
  if (typeof identifier !== 'string') {
    throw new Error('Identifier must be a string');
  }

  // Only allow alphanumeric, dash, underscore, and dot
  const sanitized = identifier.replace(/[^a-zA-Z0-9\-_]/g, '');

  if (sanitized.length === 0) {
    throw new Error('Identifier contains no valid characters');
  }

  return sanitized;
}

module.exports = {
  sanitizePath,
  safePathJoin,
  sanitizeFilename,
  isPathSafe,
  escapeRegExp,
  validateInputLength,
  sanitizeIdentifier
};
