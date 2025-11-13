/**
 * Database Seed Script
 * Populates nationwide demographic targeting system + Pittsburgh-focused industries
 *
 * Run with: npx ts-node prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client';
import { NATIONAL_METROS, INDUSTRY_VERTICALS } from '../src/data/nationalMetros';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // 0. SEED NATIONWIDE DEMOGRAPHIC TARGETING SYSTEM
  // ============================================================================

  console.log('🌎 Seeding nationwide metros...');

  // Seed all metros
  for (const metroData of NATIONAL_METROS) {
    await prisma.metro.upsert({
      where: { metroId: metroData.metroId },
      update: metroData,
      create: metroData,
    });
  }

  console.log(`✅ Seeded ${NATIONAL_METROS.length} metros\n`);

  console.log('🏭 Seeding industry verticals...');

  // Seed industry profiles for each metro (top 10 metros only for performance)
  const topMetros = await prisma.metro.findMany({
    take: 10,
    orderBy: { population: 'desc' },
  });

  let industryProfileCount = 0;

  for (const metro of topMetros) {
    for (const vertical of INDUSTRY_VERTICALS) {
      await prisma.industryProfile.upsert({
        where: {
          metroId_verticalId: {
            metroId: metro.id,
            verticalId: vertical.verticalId,
          },
        },
        update: {
          name: vertical.name,
          subCategories: vertical.subCategories,
          estimatedProspectsInMetro: vertical.estimatedProspectsInMetro,
          adaRiskLevel: vertical.adaRiskLevel,
          typicalRevenue: vertical.typicalRevenue,
          typicalEmployeeCount: vertical.typicalEmployeeCount,
          recentLawsuitCount: vertical.recentLawsuitCount,
          searchQueries: vertical.searchQueries,
          keyDirectories: vertical.keyDirectories,
        },
        create: {
          metroId: metro.id,
          verticalId: vertical.verticalId,
          name: vertical.name,
          subCategories: vertical.subCategories,
          estimatedProspectsInMetro: vertical.estimatedProspectsInMetro,
          adaRiskLevel: vertical.adaRiskLevel,
          typicalRevenue: vertical.typicalRevenue,
          typicalEmployeeCount: vertical.typicalEmployeeCount,
          recentLawsuitCount: vertical.recentLawsuitCount,
          searchQueries: vertical.searchQueries,
          keyDirectories: vertical.keyDirectories,
        },
      });
      industryProfileCount++;
    }
  }

  console.log(`✅ Created ${industryProfileCount} industry profiles for top ${topMetros.length} metros\n`);

  // ============================================================================
  // 1. CREATE INDUSTRIES
  // ============================================================================

  console.log('📋 Creating industries...');

  const industries = await Promise.all([
    // PRIMARY: Medical & Dental
    prisma.industry.upsert({
      where: { name: 'Dental Practices' },
      update: {},
      create: {
        name: 'Dental Practices',
        description: 'Dental offices and orthodontist practices',
        adariskLevel: 'high',
        typicalRevenueMin: 1000000,
        typicalRevenueMax: 5000000,
        typicalEmployeeMin: 5,
        typicalEmployeeMax: 20,
        techOrientationScore: 0.3,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: '90% have non-responsive websites, high ADA lawsuit risk',
      },
    }),

    prisma.industry.upsert({
      where: { name: 'Medical Practices' },
      update: {},
      create: {
        name: 'Medical Practices',
        description: 'Independent medical offices and clinics',
        adariskLevel: 'high',
        typicalRevenueMin: 2000000,
        typicalRevenueMax: 5000000,
        typicalEmployeeMin: 10,
        typicalEmployeeMax: 50,
        techOrientationScore: 0.35,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: '300% increase in ADA lawsuits since 2020, high revenue',
      },
    }),

    // PRIMARY: Law Firms
    prisma.industry.upsert({
      where: { name: 'Law Firms' },
      update: {},
      create: {
        name: 'Law Firms',
        description: 'Small to medium-sized law practices (3-20 attorneys)',
        adariskLevel: 'high',
        typicalRevenueMin: 1500000,
        typicalRevenueMax: 3000000,
        typicalEmployeeMin: 8,
        typicalEmployeeMax: 35,
        techOrientationScore: 0.4,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: 'Understand ADA risk, outdated WordPress sites common',
      },
    }),

    // PRIMARY: Financial Services
    prisma.industry.upsert({
      where: { name: 'Financial Services' },
      update: {},
      create: {
        name: 'Financial Services',
        description: 'CPA firms, wealth managers, financial advisors',
        adariskLevel: 'medium',
        typicalRevenueMin: 1000000,
        typicalRevenueMax: 5000000,
        typicalEmployeeMin: 5,
        typicalEmployeeMax: 30,
        techOrientationScore: 0.4,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: 'Trust-based business, elderly clients need accessible sites',
      },
    }),

    // SECONDARY: Manufacturing & Industrial
    prisma.industry.upsert({
      where: { name: 'Manufacturing' },
      update: {},
      create: {
        name: 'Manufacturing',
        description: 'Small to mid-sized manufacturing and industrial companies',
        adariskLevel: 'medium',
        typicalRevenueMin: 5000000,
        typicalRevenueMax: 50000000,
        typicalEmployeeMin: 20,
        typicalEmployeeMax: 100,
        techOrientationScore: 0.25,
        techAdoptionSpeed: 'slow',
        isBlueCollar: true,
        location: 'Pittsburgh',
        notes: 'Flash catalogs common, RIDC companies, Section 508 compliance needed for federal contracts',
      },
    }),

    prisma.industry.upsert({
      where: { name: 'Engineering Consulting' },
      update: {},
      create: {
        name: 'Engineering Consulting',
        description: 'Architectural firms and engineering consultants',
        adariskLevel: 'medium',
        typicalRevenueMin: 2000000,
        typicalRevenueMax: 15000000,
        typicalEmployeeMin: 10,
        typicalEmployeeMax: 50,
        techOrientationScore: 0.45,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: 'Talent acquisition challenge, competing for young engineers',
      },
    }),

    // SECONDARY: Professional Services
    prisma.industry.upsert({
      where: { name: 'IT Services & Consulting' },
      update: {},
      create: {
        name: 'IT Services & Consulting',
        description: 'Small IT service providers and consultancies',
        adariskLevel: 'low',
        typicalRevenueMin: 500000,
        typicalRevenueMax: 5000000,
        typicalEmployeeMin: 3,
        typicalEmployeeMax: 30,
        techOrientationScore: 0.8,
        techAdoptionSpeed: 'fast',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: 'Know ADA compliance but some ironically have their own issues',
      },
    }),

    // TERTIARY: Food & Hospitality
    prisma.industry.upsert({
      where: { name: 'Restaurants & Food Service' },
      update: {},
      create: {
        name: 'Restaurants & Food Service',
        description: 'Restaurants with multiple locations, catering, food services',
        adariskLevel: 'medium',
        typicalRevenueMin: 1000000,
        typicalRevenueMax: 20000000,
        typicalEmployeeMin: 15,
        typicalEmployeeMax: 200,
        techOrientationScore: 0.2,
        techAdoptionSpeed: 'slow',
        isBlueCollar: true,
        location: 'Pittsburgh',
        notes: 'Inaccessible PDF menus common, Domino\'s lawsuit set precedent',
      },
    }),

    prisma.industry.upsert({
      where: { name: 'Retail' },
      update: {},
      create: {
        name: 'Retail',
        description: 'Multi-location retail stores and shopping centers',
        adariskLevel: 'medium',
        typicalRevenueMin: 5000000,
        typicalRevenueMax: 50000000,
        typicalEmployeeMin: 30,
        typicalEmployeeMax: 500,
        techOrientationScore: 0.3,
        techAdoptionSpeed: 'slow',
        isBlueCollar: true,
        location: 'Pittsburgh',
        notes: 'Volume opportunity, need standardized compliance solution',
      },
    }),

    // Other relevant Pittsburgh industries
    prisma.industry.upsert({
      where: { name: 'Healthcare Administration' },
      update: {},
      create: {
        name: 'Healthcare Administration',
        description: 'Medical billing, healthcare consulting, practice management',
        adariskLevel: 'high',
        typicalRevenueMin: 1000000,
        typicalRevenueMax: 10000000,
        typicalEmployeeMin: 10,
        typicalEmployeeMax: 50,
        techOrientationScore: 0.35,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: 'B2B healthcare, compliance-focused, high value targets',
      },
    }),

    prisma.industry.upsert({
      where: { name: 'Real Estate' },
      update: {},
      create: {
        name: 'Real Estate',
        description: 'Real estate agencies and property management firms',
        adariskLevel: 'medium',
        typicalRevenueMin: 500000,
        typicalRevenueMax: 5000000,
        typicalEmployeeMin: 5,
        typicalEmployeeMax: 40,
        techOrientationScore: 0.4,
        techAdoptionSpeed: 'slow',
        isBlueCollar: false,
        location: 'Pittsburgh',
        notes: 'Need to showcase properties, visual content accessibility critical',
      },
    }),
  ]);

  console.log(`✅ Created ${industries.length} industries\n`);

  // ============================================================================
  // 2. CREATE SAMPLE BUSINESSES (PITTSBURGH)
  // ============================================================================

  console.log('🏢 Creating sample target businesses...');

  const dentalIndustry = industries.find((i) => i.name === 'Dental Practices');
  const medicalIndustry = industries.find((i) => i.name === 'Medical Practices');
  const lawIndustry = industries.find((i) => i.name === 'Law Firms');
  const financialIndustry = industries.find((i) => i.name === 'Financial Services');
  const manufacturingIndustry = industries.find((i) => i.name === 'Manufacturing');
  const restaurantIndustry = industries.find((i) => i.name === 'Restaurants & Food Service');

  const sampleBusinesses = [
    // Medical - High Priority
    {
      name: 'Smile Craft Dental',
      website: 'smilecraftdental.com',
      industryId: dentalIndustry!.id,
      location: 'Squirrel Hill, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 2300000,
      employeeCount: 12,
      ownerName: 'Dr. Sarah Chen',
      email: 'sarah@smilecraft.com',
      phone: '412-555-0101',
      matchScore: 0.95,
      outreachStatus: 'not_contacted' as const,
      notes: 'Perfect target: Non-responsive site built 2017, 4 dentists, high revenue',
    },
    {
      name: 'Advanced Ortho Pittsburgh',
      website: 'advancedortho-pgh.com',
      industryId: dentalIndustry!.id,
      location: 'Shadyside, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 2800000,
      employeeCount: 15,
      ownerName: 'Dr. Michael Rodriguez',
      email: 'contact@advancedortho.com',
      phone: '412-555-0102',
      matchScore: 0.92,
      outreachStatus: 'not_contacted' as const,
      notes: 'Specializes in orthodontics, older patients, outdated site',
    },

    // Legal - High Priority
    {
      name: 'Johnson & Associates Law',
      website: 'johnsonassociates-law.com',
      industryId: lawIndustry!.id,
      location: 'Downtown Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 2100000,
      employeeCount: 12,
      ownerName: 'Attorney James Johnson',
      email: 'james@johnsonlaw.com',
      phone: '412-555-0201',
      matchScore: 0.88,
      outreachStatus: 'not_contacted' as const,
      notes: 'Personal injury law, 5 attorneys, knows ADA risk well',
    },
    {
      name: 'Pittsburgh Estate Planning Group',
      website: 'pittsburghestateplan.com',
      industryId: lawIndustry!.id,
      location: 'Mount Washington, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 1700000,
      employeeCount: 8,
      ownerName: 'Attorney Patricia Williams',
      email: 'patricia@pittsburghestateplan.com',
      phone: '412-555-0202',
      matchScore: 0.85,
      outreachStatus: 'not_contacted' as const,
      notes: 'Estate planning, serves elderly clients, compliance concerned',
    },

    // Financial - High Priority
    {
      name: 'Pittsburgh Wealth Advisors',
      website: 'pittsburghwealthadvisors.com',
      industryId: financialIndustry!.id,
      location: 'Lawrenceville, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 3500000,
      employeeCount: 18,
      ownerName: 'David Thompson',
      email: 'david@pittsburghwealth.com',
      phone: '412-555-0301',
      matchScore: 0.86,
      outreachStatus: 'not_contacted' as const,
      notes: 'RIA firm, elderly clientele, brochureware site needs modernization',
    },
    {
      name: 'Gateway CPA Partners',
      website: 'gatewaycpapartners.com',
      industryId: financialIndustry!.id,
      location: 'Strip District, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 2400000,
      employeeCount: 14,
      ownerName: 'Susan Martinez',
      email: 'susan@gatewayoptions.com',
      phone: '412-555-0302',
      matchScore: 0.83,
      outreachStatus: 'not_contacted' as const,
      notes: 'CPA firm, 10+ staff, serves businesses and individuals',
    },

    // Manufacturing - Secondary
    {
      name: 'Pittsburgh Industrial Solutions',
      website: 'pittsburghindsolve.com',
      industryId: manufacturingIndustry!.id,
      location: 'RIDC Park, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 12000000,
      employeeCount: 45,
      ownerName: 'Robert Chen',
      email: 'robert@pittsburghindsolve.com',
      phone: '412-555-0401',
      matchScore: 0.72,
      outreachStatus: 'not_contacted' as const,
      notes: 'Industrial supplier, outdated product catalog, Federal contracts possible',
    },
    {
      name: 'Steel City Manufacturing Co',
      website: 'steelcitymfg.com',
      industryId: manufacturingIndustry!.id,
      location: 'South Side, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 8500000,
      employeeCount: 32,
      ownerName: 'James Morrison',
      email: 'james@steelcityomfg.com',
      phone: '412-555-0402',
      matchScore: 0.68,
      outreachStatus: 'not_contacted' as const,
      notes: 'Metal fabrication, targeting UPMC vendors, Section 508 compliance needed',
    },

    // Restaurants - Tertiary
    {
      name: 'Primanti Bros (Downtown)',
      website: 'primantibros.com',
      industryId: restaurantIndustry!.id,
      location: 'Downtown Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 3200000,
      employeeCount: 42,
      ownerName: 'Thomas Primanti',
      email: 'contact@primantibros.com',
      phone: '412-555-0501',
      matchScore: 0.65,
      outreachStatus: 'not_contacted' as const,
      notes: 'Multiple Pittsburgh locations, PDF menus not accessible',
    },
    {
      name: 'Local Italian Kitchen',
      website: 'localitalian.com',
      industryId: restaurantIndustry!.id,
      location: 'Lawrenceville, Pittsburgh',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 1800000,
      employeeCount: 18,
      ownerName: 'Marco Rossi',
      email: 'marco@localitalian.com',
      phone: '412-555-0502',
      matchScore: 0.62,
      outreachStatus: 'not_contacted' as const,
      notes: 'Single upscale location, newer site but not accessible',
    },
  ];

  const businesses = await Promise.all(
    sampleBusinesses.map((business) =>
      prisma.targetBusiness.upsert({
        where: { website: business.website || `temp-${business.name}` },
        update: {},
        create: {
          ...business,
          website: business.website || undefined,
        },
      })
    )
  );

  console.log(`✅ Created ${businesses.length} sample businesses\n`);

  // ============================================================================
  // 3. ADD SAMPLE VIOLATIONS TO BUSINESSES
  // ============================================================================

  console.log('⚠️  Adding sample WCAG violations...');

  const violationExamples = [
    {
      businessName: 'Smile Craft Dental',
      violations: [
        { wcagCriteria: '1.4.3', severity: 'critical', description: 'Insufficient color contrast on navigation menu' },
        { wcagCriteria: '1.1.1', severity: 'high', description: 'Doctor photos missing alt text' },
        { wcagCriteria: '2.1.1', severity: 'high', description: 'Contact form not keyboard accessible' },
      ],
    },
    {
      businessName: 'Johnson & Associates Law',
      violations: [
        { wcagCriteria: '1.4.3', severity: 'critical', description: 'Gray text on light background' },
        { wcagCriteria: '2.4.3', severity: 'high', description: 'Focus indicator not visible on links' },
        { wcagCriteria: '1.1.1', severity: 'high', description: 'Attorney profile images unlabeled' },
      ],
    },
    {
      businessName: 'Pittsburgh Wealth Advisors',
      violations: [
        { wcagCriteria: '1.3.1', severity: 'high', description: 'Form labels not properly associated' },
        { wcagCriteria: '1.4.3', severity: 'critical', description: 'Dark blue text on dark background' },
      ],
    },
  ];

  for (const example of violationExamples) {
    const business = businesses.find((b) => b.name === example.businessName);
    if (business) {
      await Promise.all(
        example.violations.map((v) =>
          prisma.targetBusinessViolation.create({
            data: {
              businessId: business.id,
              ...v,
              count: 1,
            },
          })
        )
      );

      // Update violation count
      const violationCount = example.violations.length;
      await prisma.targetBusiness.update({
        where: { id: business.id },
        data: { wcagViolationCount: violationCount },
      });
    }
  }

  console.log('✅ Added sample violations\n');

  // ============================================================================
  // 4. SUMMARY
  // ============================================================================

  console.log('📊 Seed Summary:');
  console.log(`   Metros: ${NATIONAL_METROS.length}`);
  console.log(`   Industry Profiles: ${industryProfileCount}`);
  console.log(`   Industries: ${industries.length}`);
  console.log(`   Businesses: ${businesses.length}`);
  console.log('');
  console.log('🎉 Database seeding complete!');
  console.log('');
  console.log('🔥 Nationwide Demographic Targeting API Endpoints:');
  console.log('  - GET /api/demographics/metros');
  console.log('  - GET /api/demographics/metros/:metroId');
  console.log('  - GET /api/demographics/industries');
  console.log('  - POST /api/demographics/discover');
  console.log('  - POST /api/demographics/batch-audit');
  console.log('  - POST /api/demographics/score-risk');
  console.log('');
  console.log('📍 Legacy Pittsburgh-Focused API Endpoints:');
  console.log('  - GET /api/target-demographics/industries');
  console.log('  - GET /api/target-demographics/businesses');
  console.log('  - POST /api/target-demographics/businesses/search');
  console.log('  - GET /api/target-demographics/statistics');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
