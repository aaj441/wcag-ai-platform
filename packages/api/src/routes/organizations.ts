import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/utils/database';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  asyncHandler 
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/middleware/auth';

const router = Router();

// Validation rules
const createOrganizationValidation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Organization name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Description must be less than 500 characters'),
  body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),
];

const updateOrganizationValidation = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('Organization name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('Description must be less than 500 characters'),
  body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),
];

const inviteMemberValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('role')
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Role must be either ADMIN or MEMBER'),
];

const updateMemberRoleValidation = [
  body('role')
    .isIn(['ADMIN', 'MEMBER'])
    .withMessage('Role must be either ADMIN or MEMBER'),
];

// Create new organization
router.post('/', createOrganizationValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { name, description, website } = req.body;

  // Generate unique slug from name
  const slug = generateSlug(name);
  
  // Check if slug is already taken
  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existingOrg) {
    throw new ConflictError('An organization with this name already exists');
  }

  // Create organization
  const organization = await prisma.organization.create({
    data: {
      id: uuidv4(),
      name,
      slug,
      description,
      website,
    },
  });

  // Add user as owner
  await prisma.organizationMember.create({
    data: {
      userId: req.user.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  });

  // Get complete organization data
  const createdOrg = await prisma.organization.findUnique({
    where: { id: organization.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          scans: true,
          projects: true,
        },
      },
    },
  });

  logger.info(`New organization created: ${organization.id} by user: ${req.user.id}`);

  res.status(201).json({
    success: true,
    message: 'Organization created successfully',
    data: createdOrg,
  });
}));

// Get user's organizations
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const organizations = await prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId: req.user.id,
        },
      },
    },
    include: {
      members: {
        where: {
          userId: req.user.id,
        },
        select: {
          role: true,
          joinedAt: true,
        },
      },
      _count: {
        select: {
          members: true,
          scans: true,
          projects: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: organizations,
  });
}));

// Get organization by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const organizationId = req.params.id;

  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      members: {
        some: {
          userId: req.user.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              isActive: true,
              lastLogin: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              scans: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          members: true,
          scans: true,
          projects: true,
        },
      },
    },
  });

  if (!organization) {
    throw new NotFoundError('Organization');
  }

  res.json({
    success: true,
    data: organization,
  });
}));

// Update organization
router.put('/:id', updateOrganizationValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const organizationId = req.params.id;
  const { name, description, website } = req.body;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  // Check user permission (OWNER or ADMIN)
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId,
      },
    },
  });

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new ValidationError('Only organization owners and admins can update organization');
  }

  // Check if name is being changed and if new slug is available
  let updateData: any = { description, website };
  
  if (name) {
    const newSlug = generateSlug(name);
    
    if (newSlug !== organizationId) {
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: newSlug },
      });
      
      if (existingOrg) {
        throw new ConflictError('An organization with this name already exists');
      }
    }
    
    updateData.name = name;
    updateData.slug = newSlug;
  }

  // Update organization
  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
  });

  logger.info(`Organization updated: ${organizationId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Organization updated successfully',
    data: updatedOrganization,
  });
}));

// Delete organization
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const organizationId = req.params.id;

  // Check user permission (only OWNER)
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId,
      },
    },
  });

  if (!membership || membership.role !== 'OWNER') {
    throw new ValidationError('Only organization owners can delete organization');
  }

  // Delete organization (this will cascade delete related records)
  await prisma.organization.delete({
    where: { id: organizationId },
  });

  logger.info(`Organization deleted: ${organizationId} by user: ${req.user.id}`);

  res.json({
    success: true,
    message: 'Organization deleted successfully',
  });
}));

// Invite member
router.post('/:id/invite', inviteMemberValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const organizationId = req.params.id;
  const { email, role } = req.body;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  // Check user permission (OWNER or ADMIN)
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId,
      },
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new ValidationError('Only organization owners and admins can invite members');
  }

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError('User is already a member of this organization');
    }
  }

  // Generate invite token
  const inviteToken = require('jsonwebtoken').sign(
    { 
      organizationId, 
      email, 
      role,
      type: 'organization_invite',
      invitedBy: req.user.id 
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  // Store invite token in cache
  const { setCache } = await import('@/utils/redis');
  await setCache(`invite_token:${inviteToken}`, {
    organizationId,
    email,
    role,
    invitedBy: req.user.id,
  }, 7 * 24 * 60 * 60); // 7 days

  // Send invite email
  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${inviteToken}`;
  
  try {
    const { emailService } = await import('@/utils/email');
    await emailService.sendOrganizationInviteEmail(
      email,
      `${req.user.firstName || req.user.username}`,
      membership.organization.name,
      inviteUrl
    );
  } catch (emailError) {
    logger.error('Failed to send organization invite email:', emailError);
    throw new Error('Failed to send invitation email');
  }

  logger.info(`Organization invitation sent: ${email} to ${organizationId} by ${req.user.id}`);

  res.json({
    success: true,
    message: 'Invitation sent successfully',
    data: {
      email,
      role,
      inviteUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
}));

// Accept invitation
router.post('/invite/:inviteToken/accept', asyncHandler(async (req: Request, res: Response) => {
  const { inviteToken } = req.params;

  try {
    // Verify invite token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'organization_invite') {
      throw new Error('Invalid invite token');
    }

    // Check if token is still valid in cache
    const { getCache } = await import('@/utils/redis');
    const inviteData = await getCache(`invite_token:${inviteToken}`);
    
    if (!inviteData) {
      throw new Error('Invite token has expired or been used');
    }

    // Get authenticated user (should be logged in)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ValidationError('Authentication required to accept invitation');
    }

    const token = authHeader.substring(7);
    const userDecoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (!userDecoded || !userDecoded.userId) {
      throw new ValidationError('Invalid authentication token');
    }

    // Check if user email matches invite
    const user = await prisma.user.findUnique({
      where: { id: userDecoded.userId },
      select: { id: true, email: true },
    });

    if (!user || user.email !== inviteData.email) {
      throw new ValidationError('This invitation is for a different email address');
    }

    // Check if user is already a member
    const existingMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: inviteData.organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictError('You are already a member of this organization');
    }

    // Add user to organization
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: inviteData.organizationId,
        role: inviteData.role,
      },
    });

    // Clean up invite token
    await deleteCache(`invite_token:${inviteToken}`);

    logger.info(`Organization invitation accepted: ${user.email} joined ${inviteData.organizationId}`);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ValidationError('Invalid or expired invitation link');
    }
    throw error;
  }
}));

// Remove member
router.delete('/:id/members/:memberId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const { id: organizationId, memberId } = req.params;

  // Check user permission (OWNER or ADMIN can remove, but can't remove OWNER)
  const userMembership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId,
      },
    },
  });

  if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
    throw new ValidationError('Only organization owners and admins can remove members');
  }

  // Get member to remove
  const memberToRemove = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: memberId,
        organizationId,
      },
    },
  });

  if (!memberToRemove) {
    throw new NotFoundError('Member');
  }

  // Cannot remove owner unless you're the owner yourself
  if (memberToRemove.role === 'OWNER' && userMembership.role !== 'OWNER') {
    throw new ValidationError('Cannot remove organization owner');
  }

  // Remove member
  await prisma.organizationMember.delete({
    where: {
      userId_organizationId: {
        userId: memberId,
        organizationId,
      },
    },
  });

  logger.info(`Member removed from organization: ${memberId} from ${organizationId} by ${req.user.id}`);

  res.json({
    success: true,
    message: 'Member removed successfully',
  });
}));

// Update member role
router.put('/:id/members/:memberId', updateMemberRoleValidation, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const { id: organizationId, memberId } = req.params;
  const { role } = req.body;

  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  // Check user permission (only OWNER can change roles)
  const userMembership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId,
      },
    },
  });

  if (!userMembership || userMembership.role !== 'OWNER') {
    throw new ValidationError('Only organization owners can change member roles');
  }

  // Get member to update
  const memberToUpdate = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: memberId,
        organizationId,
      },
    },
  });

  if (!memberToUpdate) {
    throw new NotFoundError('Member');
  }

  // Cannot change owner role
  if (memberToUpdate.role === 'OWNER') {
    throw new ValidationError('Cannot change organization owner role');
  }

  // Cannot change your own role to non-owner
  if (memberId === req.user.id && role !== 'OWNER') {
    throw new ValidationError('Cannot change your own role to non-owner');
  }

  // Update member role
  const updatedMembership = await prisma.organizationMember.update({
    where: {
      userId_organizationId: {
        userId: memberId,
        organizationId,
      },
    },
    data: { role },
  });

  logger.info(`Member role updated: ${memberId} in ${organizationId} to ${role} by ${req.user.id}`);

  res.json({
    success: true,
    message: 'Member role updated successfully',
    data: updatedMembership,
  });
}));

// Get organization statistics
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new Error('Authentication required');
  }

  const organizationId = req.params.id;

  // Check membership
  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: req.user.id,
        organizationId,
      },
    },
  });

  if (!membership) {
    throw new ValidationError('Access denied to this organization');
  }

  // Get organization statistics
  const [
    totalScans,
    completedScans,
    totalIssues,
    memberCount,
    projectCount,
    recentActivity,
  ] = await Promise.all([
    // Total scans
    prisma.scan.count({
      where: { organizationId },
    }),
    
    // Completed scans
    prisma.scan.count({
      where: { 
        organizationId,
        status: 'COMPLETED',
      },
    }),
    
    // Total issues from completed scans
    prisma.issue.aggregate({
      where: {
        scan: {
          organizationId,
          status: 'COMPLETED',
        },
      },
      _sum: {
        totalIssues: true,
        criticalIssues: true,
        seriousIssues: true,
        moderateIssues: true,
        minorIssues: true,
      },
    }),
    
    // Member count
    prisma.organizationMember.count({
      where: { organizationId },
    }),
    
    // Project count
    prisma.project.count({
      where: { organizationId },
    }),
    
    // Recent activity (last 30 days)
    prisma.scan.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const stats = {
    overview: {
      totalScans,
      completedScans,
      totalIssues: totalIssues._sum.totalIssues || 0,
      memberCount,
      projectCount,
      recentActivity,
      completionRate: totalScans > 0 ? (completedScans / totalScans) * 100 : 0,
    },
    issues: {
      critical: totalIssues._sum.criticalIssues || 0,
      serious: totalIssues._sum.seriousIssues || 0,
      moderate: totalIssues._sum.moderateIssues || 0,
      minor: totalIssues._sum.minorIssues || 0,
    },
  };

  res.json({
    success: true,
    data: stats,
  });
}));

// Helper functions
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export default router;