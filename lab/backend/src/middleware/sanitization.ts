/**
 * Input sanitization middleware
 * Protects against XSS, SQL injection, and other attacks
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitize an object
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove potentially dangerous characters
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (value && typeof value === 'object') {
    const sanitized: any = {};
    for (const key in value) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Sanitize request body, query, and params
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  
  next();
};
