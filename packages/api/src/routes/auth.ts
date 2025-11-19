import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '@/utils/database';
import { emailService } from '@/utils/email';
import { setCache, deleteCache } from '@/utils/redis';
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, and number'),
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .trim(),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .trim(),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, and number'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must be at least 8 characters and contain uppercase, lowercase, and number'),
];

// Generate JWT token
const generateToken = (userId: string, email: string, role: string): string => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );
};

// Register new user
router.post('/register', registerValidation, asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, username, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ConflictError('A user with this email already exists');
    }
    if (existingUser.username === username) {
      throw new ConflictError('This username is already taken');
    }
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token in Redis
  await setCache(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 60 * 60); // 30 days

  // Send welcome email
  try {
    await emailService.sendWelcomeEmail(user.email, `${user.firstName || user.username}`);
  } catch (emailError) {
    logger.warn('Failed to send welcome email:', emailError);
  }

  // Log registration
  logger.info(`New user registered: ${user.email} (${user.id})`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });
}));

// Login user
router.post('/login', loginValidation, asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLogin: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Account is inactive');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateToken(user.id, user.email, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // Store refresh token in Redis
  await setCache(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 60 * 60); // 30 days

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  // Log login
  logger.info(`User logged in: ${user.email} (${user.id})`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });
}));

// Logout user
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      // Decode token to get user ID
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.userId) {
        // Remove refresh token from Redis
        await deleteCache(`refresh_token:${decoded.userId}`);
        
        // Add access token to blacklist
        await setCache(`blacklist:${token}`, 'true', 7 * 24 * 60 * 60); // 7 days
        
        logger.info(`User logged out: ${decoded.userId}`);
      }
    } catch (error) {
      logger.warn('Error during logout:', error);
    }
  }

  res.json({
    success: true,
    message: 'Logout successful',
  });
}));

// Refresh access token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('Refresh token is required');
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'refresh' || !decoded.userId) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if refresh token is still valid in Redis
    const storedToken = await getCache(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      throw new AuthenticationError('Refresh token has been revoked');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Generate new access token
    const newAccessToken = generateToken(user.id, user.email, user.role);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw error;
  }
}));

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      isActive: true,
    },
  });

  if (!user) {
    // Don't reveal that user doesn't exist
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent',
    });
    return;
  }

  if (!user.isActive) {
    // Don't reveal that account is inactive
    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent',
    });
    return;
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id, type: 'password_reset' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  // Store reset token in Redis
  await setCache(`reset_token:${resetToken}`, user.id, 60 * 60); // 1 hour

  // Send reset email
  try {
    await emailService.sendPasswordResetEmail(user.email, resetToken);
  } catch (emailError) {
    logger.error('Failed to send password reset email:', emailError);
    throw new Error('Failed to send password reset email');
  }

  logger.info(`Password reset requested for: ${user.email}`);

  res.json({
    success: true,
    message: 'If an account with this email exists, a password reset link has been sent',
  });
}));

// Reset password
router.post('/reset-password', resetPasswordValidation, asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { token, password } = req.body;

  try {
    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'password_reset' || !decoded.userId) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Check if reset token is still valid in Redis
    const userId = await getCache(`reset_token:${token}`);
    if (!userId || userId !== decoded.userId) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Clean up reset token
    await deleteCache(`reset_token:${token}`);

    // Remove all refresh tokens for this user
    await deleteCache(`refresh_token:${userId}`);

    logger.info(`Password reset completed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid or expired reset token');
    }
    throw error;
  }
}));

// Change password (authenticated)
router.post('/change-password', changePasswordValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      password: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Account is inactive');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Check if new password is different from current
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new ValidationError('New password must be different from current password');
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update user password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Remove all refresh tokens for this user (force re-login on all devices)
  await deleteCache(`refresh_token:${user.id}`);

  logger.info(`Password changed for user: ${user.id}`);

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
}));

// Validate token
router.get('/validate', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AuthenticationError('Token is required');
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await getCache(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (!decoded.userId) {
      throw new AuthenticationError('Invalid token');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user,
        tokenExpiresIn: jwt.decode(token, { complete: true })?.payload?.exp,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    throw error;
  }
}));

export default router;