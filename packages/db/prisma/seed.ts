import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      plan: 'PRO',
      status: 'ACTIVE',
      monthlyScansLimit: 100,
      monthlyScansUsed: 0,
    },
  })

  console.log('✅ Created demo tenant:', demoTenant.slug)

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@infinitysoul.com' },
    update: {},
    create: {
      email: 'demo@infinitysoul.com',
      name: 'Demo User',
      role: 'ADMIN',
      tenantId: demoTenant.id,
    },
  })

  console.log('✅ Created demo user:', demoUser.email)

  // Create sample scan
  const demoScan = await prisma.scan.create({
    data: {
      url: 'https://example.com',
      status: 'COMPLETED',
      wcagLevel: 'AA',
      scanType: 'FULL',
      complianceScore: 85,
      totalViolations: 15,
      criticalCount: 2,
      seriousCount: 5,
      moderateCount: 6,
      minorCount: 2,
      executiveSummary: 'Sample scan results for demonstration purposes.',
      aiConfidence: 0.92,
      userId: demoUser.id,
      tenantId: demoTenant.id,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  })

  console.log('✅ Created demo scan:', demoScan.id)

  // Create sample violations
  await prisma.violation.createMany({
    data: [
      {
        scanId: demoScan.id,
        wcagCode: '1.1.1',
        wcagLevel: 'A',
        severity: 'CRITICAL',
        category: 'PERCEIVABLE',
        title: 'Non-text Content',
        description: 'Images must have alternative text',
        impact: 'Screen reader users cannot understand image content',
        selector: 'img#logo',
        html: '<img src="logo.png">',
        aiSuggestion: 'Add descriptive alt text to the image',
        remediation: ['Add alt attribute with descriptive text', 'Example: alt="Company logo"'],
        confidenceScore: 0.95,
        elementVisibility: 1.0,
        dynamicContent: 0.8,
        browserCompat: 1.0,
        sampleSize: 0.9,
      },
      {
        scanId: demoScan.id,
        wcagCode: '2.4.1',
        wcagLevel: 'A',
        severity: 'SERIOUS',
        category: 'OPERABLE',
        title: 'Bypass Blocks',
        description: 'Skip to main content link is missing',
        impact: 'Keyboard users must tab through navigation on every page',
        aiSuggestion: 'Add a skip navigation link at the beginning of the page',
        remediation: ['Add skip link before navigation', 'Ensure link is keyboard accessible'],
        confidenceScore: 0.88,
        elementVisibility: 0.9,
        dynamicContent: 0.7,
        browserCompat: 1.0,
        sampleSize: 0.95,
      },
    ],
  })

  console.log('✅ Created sample violations')
  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
