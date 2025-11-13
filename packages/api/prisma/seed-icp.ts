/**
 * Comprehensive ICP & Geographic Seed Script
 * Creates 50 metropolitan areas × 20 industries with ideal customer profiles
 * Plus 3 decision maker personas and 1000+ sample businesses
 *
 * Run with: npm run seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌐 Starting comprehensive multi-metro ICP seed...\n');

  // ============================================================================
  // 1. CREATE DECISION MAKER PERSONAS
  // ============================================================================

  console.log('👥 Creating 3 decision maker personas...');

  const decisionMakers = await Promise.all([
    prisma.decisionMaker.upsert({
      where: { title: 'Owner/C-Suite Executive' },
      update: {},
      create: {
        title: 'Owner/C-Suite Executive',
        role: 'owner',
        roleDescription: 'Business owner, partner, or C-level executive with final decision authority',
        influenceLevel: 5,
        decisionMakingAuthority: 'sole_decision',
        typicalDayToDayPain: 'Worried about lawsuits, managing team, bottom line revenue',
        painPoints: JSON.stringify([
          'ADA compliance liability',
          'Online booking/revenue generation',
          'Outdated technology',
          'Staff turnover',
          'Reputation management',
        ]),
        motivations: JSON.stringify([
          'Avoid legal exposure',
          'Increase revenue',
          'Look modern/professional',
          'Competitive advantage',
          'Attract young talent',
        ]),
        purchaseDrivers: JSON.stringify([
          'Lawsuit threat',
          'Competitor action',
          'Staff complaint',
          'Customer feedback',
          'Media coverage',
        ]),
        preferredOutreachChannel: 'phone',
        bestTimeToReach: 'Tuesday-Thursday 10am-11am or 4pm-5pm',
        contentPreference: 'business',
        typicalSalaryRange: '$80k-$500k+',
        reportingStructure: 'Self/Board of Directors',
      },
    }),
    prisma.decisionMaker.upsert({
      where: { title: 'Operations/Practice Manager' },
      update: {},
      create: {
        title: 'Operations/Practice Manager',
        role: 'operations',
        roleDescription: 'Day-to-day operations lead, practice manager, office manager',
        influenceLevel: 4,
        decisionMakingAuthority: 'key_influencer',
        typicalDayToDayPain: 'Website issues affecting daily operations, patient/customer complaints, booking problems',
        painPoints: JSON.stringify([
          'Website downtime/issues',
          'Online booking problems',
          'Patient frustration',
          'Manual scheduling inefficiency',
          'Technology gaps',
        ]),
        motivations: JSON.stringify([
          'Smooth daily operations',
          'Happy patients/customers',
          'Reduce manual work',
          'Better reporting/analytics',
          'Team efficiency',
        ]),
        purchaseDrivers: JSON.stringify([
          'Recurring customer complaint',
          'Staff efficiency gain',
          'Operational metrics',
          'Time savings',
        ]),
        preferredOutreachChannel: 'email',
        bestTimeToReach: 'Tuesday-Thursday 2pm-3pm',
        contentPreference: 'case_studies',
        typicalSalaryRange: '$45k-$85k',
        reportingStructure: 'Reports to Owner/C-Suite',
      },
    }),
    prisma.decisionMaker.upsert({
      where: { title: 'Marketing/IT Manager' },
      update: {},
      create: {
        title: 'Marketing/IT Manager',
        role: 'marketing',
        roleDescription: 'Marketing director, IT manager, digital lead responsible for online presence',
        influenceLevel: 3,
        decisionMakingAuthority: 'implementer',
        typicalDayToDayPain: 'Website performance, SEO, digital presence, technical issues',
        painPoints: JSON.stringify([
          'Poor website performance',
          'Low SEO rankings',
          'Accessibility issues',
          'Outdated technology',
          'Limited budget for updates',
        ]),
        motivations: JSON.stringify([
          'Better online visibility',
          'Generate leads',
          'Improve user experience',
          'Modern tech stack',
          'Career advancement',
        ]),
        purchaseDrivers: JSON.stringify([
          'SEO opportunity',
          'Accessibility audit results',
          'Competitor website comparison',
          'Industry report',
          'Conference/webinar',
        ]),
        preferredOutreachChannel: 'linkedin',
        bestTimeToReach: 'Wednesday-Friday 10am-11am',
        contentPreference: 'technical',
        typicalSalaryRange: '$55k-$95k',
        reportingStructure: 'Reports to Owner/Operations Manager',
      },
    }),
  ]);

  console.log(`✅ Created ${decisionMakers.length} decision maker personas\n`);

  // ============================================================================
  // 2. CREATE 50 METROPOLITAN AREAS
  // ============================================================================

  console.log('🗺️  Creating 50 metropolitan areas...');

  const metros = [
    // Top metros by population and SMB density
    { name: 'New York Metro', code: 'NYC', region: 'Northeast', population: 20140470, income: 75000, density: 8.5, techIndex: 0.75, webQuality: 0.65, smbs: 450000 },
    { name: 'Los Angeles Metro', code: 'LA', region: 'West', population: 13200000, income: 72000, density: 8.2, techIndex: 0.78, webQuality: 0.68, smbs: 420000 },
    { name: 'Chicago Metro', code: 'CHI', region: 'Midwest', population: 9656620, income: 68000, density: 7.5, techIndex: 0.70, webQuality: 0.60, smbs: 310000 },
    { name: 'Dallas Metro', code: 'DFW', region: 'South', population: 7637387, income: 69000, density: 7.8, techIndex: 0.72, webQuality: 0.62, smbs: 245000 },
    { name: 'Houston Metro', code: 'HOU', region: 'South', population: 7122240, income: 67000, density: 7.2, techIndex: 0.68, webQuality: 0.58, smbs: 228000 },
    { name: 'Philadelphia Metro', code: 'PHI', region: 'Northeast', population: 6245051, income: 71000, density: 7.0, techIndex: 0.68, webQuality: 0.57, smbs: 200000 },
    { name: 'Washington DC Metro', code: 'DC', region: 'Northeast', population: 6385162, income: 85000, density: 7.4, techIndex: 0.80, webQuality: 0.72, smbs: 205000 },
    { name: 'Miami Metro', code: 'MIA', region: 'South', population: 6091747, income: 65000, density: 7.6, techIndex: 0.70, webQuality: 0.59, smbs: 195000 },
    { name: 'Atlanta Metro', code: 'ATL', region: 'South', population: 6020364, income: 70000, density: 7.3, techIndex: 0.74, webQuality: 0.64, smbs: 193000 },
    { name: 'Phoenix Metro', code: 'PHX', region: 'West', population: 4948203, income: 66000, density: 6.8, techIndex: 0.69, webQuality: 0.60, smbs: 158000 },
    { name: 'San Francisco Metro', code: 'SF', region: 'West', population: 4749008, income: 95000, density: 7.9, techIndex: 0.92, webQuality: 0.85, smbs: 152000 },
    { name: 'Seattle Metro', code: 'SEA', region: 'West', population: 4018762, income: 82000, density: 7.2, techIndex: 0.88, webQuality: 0.80, smbs: 129000 },
    { name: 'Minneapolis Metro', code: 'MSP', region: 'Midwest', population: 3663117, income: 77000, density: 6.8, techIndex: 0.75, webQuality: 0.65, smbs: 117000 },
    { name: 'Denver Metro', code: 'DEN', region: 'Mountain', population: 3107114, income: 78000, density: 6.9, techIndex: 0.77, webQuality: 0.67, smbs: 99000 },
    { name: 'Boston Metro', code: 'BOS', region: 'Northeast', population: 4941632, income: 83000, density: 7.4, techIndex: 0.82, webQuality: 0.74, smbs: 158000 },
    { name: 'Tampa Metro', code: 'TPA', region: 'South', population: 3175191, income: 63000, density: 6.5, techIndex: 0.66, webQuality: 0.56, smbs: 102000 },
    { name: 'Austin Metro', code: 'AUS', region: 'South', population: 2310527, income: 75000, density: 6.9, techIndex: 0.82, webQuality: 0.72, smbs: 74000 },
    { name: 'Las Vegas Metro', code: 'LV', region: 'West', population: 2301937, income: 62000, density: 6.6, techIndex: 0.65, webQuality: 0.55, smbs: 74000 },
    { name: 'Portland Metro', code: 'PDX', region: 'West', population: 2512373, income: 74000, density: 6.7, techIndex: 0.80, webQuality: 0.70, smbs: 80000 },
    { name: 'Kansas City Metro', code: 'KC', region: 'Midwest', population: 2397944, income: 69000, density: 6.3, techIndex: 0.68, webQuality: 0.58, smbs: 77000 },
    { name: 'Las Vegas', code: 'LVG', region: 'West', population: 2227574, income: 61000, density: 6.5, techIndex: 0.64, webQuality: 0.54, smbs: 71000 },
    { name: 'Riverside Metro', code: 'RSI', region: 'West', population: 2408199, income: 63000, density: 6.4, techIndex: 0.62, webQuality: 0.52, smbs: 77000 },
    { name: 'Long Beach Metro', code: 'LGB', region: 'West', population: 1306156, income: 62000, density: 7.1, techIndex: 0.65, webQuality: 0.55, smbs: 42000 },
    { name: 'San Diego Metro', code: 'SD', region: 'West', population: 3298634, income: 74000, density: 7.0, techIndex: 0.78, webQuality: 0.68, smbs: 106000 },
    { name: 'Sacramento Metro', code: 'SAC', region: 'West', population: 2381682, income: 72000, density: 6.5, techIndex: 0.70, webQuality: 0.60, smbs: 76000 },
    { name: 'Pittsburgh Metro', code: 'PIT', region: 'Northeast', population: 2317600, income: 70000, density: 6.2, techIndex: 0.62, webQuality: 0.54, smbs: 74000 },
    { name: 'Detroit Metro', code: 'DET', region: 'Midwest', population: 4297617, income: 66000, density: 6.4, techIndex: 0.64, webQuality: 0.54, smbs: 138000 },
    { name: 'Charlotte Metro', code: 'CLT', region: 'South', population: 2636883, income: 72000, density: 6.8, techIndex: 0.73, webQuality: 0.63, smbs: 84000 },
    { name: 'Orlando Metro', code: 'MCO', region: 'South', population: 2387311, income: 64000, density: 6.6, techIndex: 0.67, webQuality: 0.57, smbs: 76000 },
    { name: 'Memphis Metro', code: 'MEM', region: 'South', population: 1367543, income: 60000, density: 5.9, techIndex: 0.60, webQuality: 0.50, smbs: 44000 },
    { name: 'Louisville Metro', code: 'LOU', region: 'South', population: 1411456, income: 64000, density: 6.0, techIndex: 0.63, webQuality: 0.53, smbs: 45000 },
    { name: 'Baltimore Metro', code: 'BWI', region: 'Northeast', population: 2823699, income: 75000, density: 6.7, techIndex: 0.70, webQuality: 0.60, smbs: 90000 },
    { name: 'New Orleans Metro', code: 'MSY', region: 'South', population: 1270530, income: 61000, density: 6.1, techIndex: 0.59, webQuality: 0.49, smbs: 41000 },
    { name: 'Salt Lake City Metro', code: 'SLC', region: 'Mountain', population: 1285933, income: 76000, density: 6.6, techIndex: 0.76, webQuality: 0.66, smbs: 41000 },
    { name: 'St. Louis Metro', code: 'STL', region: 'Midwest', population: 2803228, income: 67000, density: 6.2, techIndex: 0.65, webQuality: 0.55, smbs: 90000 },
    { name: 'Tucson Metro', code: 'TUS', region: 'West', population: 1086880, income: 62000, density: 5.8, techIndex: 0.61, webQuality: 0.51, smbs: 35000 },
    { name: 'Albuquerque Metro', code: 'ABQ', region: 'West', population: 978057, income: 61000, density: 5.6, techIndex: 0.60, webQuality: 0.50, smbs: 31000 },
    { name: 'Bakersfield Metro', code: 'BAK', region: 'West', population: 900202, income: 58000, density: 5.5, techIndex: 0.57, webQuality: 0.47, smbs: 29000 },
    { name: 'Fresno Metro', code: 'FAT', region: 'West', population: 1008654, income: 59000, density: 5.7, techIndex: 0.58, webQuality: 0.48, smbs: 32000 },
    { name: 'San Antonio Metro', code: 'SAT', region: 'South', population: 2550960, income: 62000, density: 6.5, techIndex: 0.65, webQuality: 0.55, smbs: 82000 },
    { name: 'Milwaukee Metro', code: 'MKE', region: 'Midwest', population: 1574731, income: 68000, density: 6.1, techIndex: 0.64, webQuality: 0.54, smbs: 50000 },
    { name: 'Nashville Metro', code: 'BNA', region: 'South', population: 1962126, income: 71000, density: 6.6, techIndex: 0.71, webQuality: 0.61, smbs: 63000 },
    { name: 'Raleigh Metro', code: 'RDU', region: 'South', population: 1385504, income: 77000, density: 6.5, techIndex: 0.76, webQuality: 0.66, smbs: 44000 },
    { name: 'Honolulu Metro', code: 'HNL', region: 'West', population: 909073, income: 80000, density: 6.9, techIndex: 0.75, webQuality: 0.65, smbs: 29000 },
    { name: 'Hartford Metro', code: 'BDL', region: 'Northeast', population: 1178873, income: 78000, density: 6.3, techIndex: 0.71, webQuality: 0.61, smbs: 38000 },
    { name: 'Buffalo Metro', code: 'BUF', region: 'Northeast', population: 1190541, income: 66000, density: 5.9, techIndex: 0.62, webQuality: 0.52, smbs: 38000 },
    { name: 'Rochester Metro', code: 'ROC', region: 'Northeast', population: 1079798, income: 70000, density: 5.8, techIndex: 0.65, webQuality: 0.55, smbs: 35000 },
    { name: 'Oklahoma City Metro', code: 'OKC', region: 'South', population: 1396445, income: 64000, density: 6.0, techIndex: 0.62, webQuality: 0.52, smbs: 45000 },
    { name: 'Tulsa Metro', code: 'MUS', region: 'South', population: 1015182, income: 62000, density: 5.7, techIndex: 0.60, webQuality: 0.50, smbs: 33000 },
    { name: 'Cincinnati Metro', code: 'CVG', region: 'Midwest', population: 2256884, income: 69000, density: 6.3, techIndex: 0.66, webQuality: 0.56, smbs: 72000 },
    { name: 'Columbus Metro', code: 'CMH', region: 'Midwest', population: 2114097, income: 71000, density: 6.4, techIndex: 0.68, webQuality: 0.58, smbs: 68000 },
  ];

  const createdMetros = await Promise.all(
    metros.map((m) =>
      prisma.metropolitanArea.upsert({
        where: { marketCode: m.code },
        update: {},
        create: {
          name: m.name,
          marketCode: m.code,
          region: m.region,
          population: m.population,
          avgMedianHouseholdIncome: m.income,
          businessDensityIndex: m.density,
          techAdoptionIndex: m.techIndex,
          averageWebsiteQuality: m.webQuality,
          estimatedSmallBusinessCount: m.smbs,
        },
      })
    )
  );

  console.log(`✅ Created ${createdMetros.length} metropolitan areas\n`);

  // ============================================================================
  // 3. CREATE INDUSTRIES (if not already done)
  // ============================================================================

  console.log('📋 Creating 20 core industries...');

  const industryData = [
    { name: 'Dental Practices', risk: 'high' },
    { name: 'Medical Practices', risk: 'high' },
    { name: 'Law Firms', risk: 'high' },
    { name: 'Physical Therapy', risk: 'high' },
    { name: 'Financial Services', risk: 'medium' },
    { name: 'Real Estate', risk: 'medium' },
    { name: 'Manufacturing', risk: 'medium' },
    { name: 'Engineering', risk: 'medium' },
    { name: 'Construction', risk: 'medium' },
    { name: 'Restaurants', risk: 'medium' },
    { name: 'Hotels', risk: 'medium' },
    { name: 'Retail', risk: 'medium' },
    { name: 'HVAC Services', risk: 'low' },
    { name: 'Auto Repair', risk: 'low' },
    { name: 'Plumbing', risk: 'low' },
    { name: 'Electrical Services', risk: 'low' },
    { name: 'Fitness Centers', risk: 'low' },
    { name: 'Hair Salons', risk: 'low' },
    { name: 'Veterinary Clinics', risk: 'low' },
    { name: 'Accounting/CPA', risk: 'medium' },
  ];

  const industries = await Promise.all(
    industryData.map((ind) =>
      prisma.industry.upsert({
        where: { name: ind.name },
        update: {},
        create: {
          name: ind.name,
          description: `${ind.name} - Target demographic for WCAG compliance services`,
          adariskLevel: ind.risk,
          techOrientationScore: ind.risk === 'high' ? 0.35 : ind.risk === 'medium' ? 0.45 : 0.25,
          techAdoptionSpeed: 'slow',
          isBlueCollar: ['HVAC Services', 'Auto Repair', 'Plumbing', 'Electrical Services', 'Restaurants'].includes(ind.name),
        },
      })
    )
  );

  console.log(`✅ Created ${industries.length} industries\n`);

  // ============================================================================
  // 4. CREATE ICP PROFILES (Industry × Metropolitan Area)
  // ============================================================================

  console.log('🎯 Creating ICP profiles (industries × metros)...');

  let icpCount = 0;
  const icpProfiles: any[] = [];

  for (const industry of industries) {
    for (const metro of createdMetros) {
      const icpProfile = await prisma.idealCustomerProfile.upsert({
        where: {
          industryId_metropolitanAreaId: {
            industryId: industry.id,
            metropolitanAreaId: metro.id,
          },
        },
        update: {},
        create: {
          name: `${industry.name} - ${metro.name}`,
          description: `Ideal customer profile for ${industry.name} in the ${metro.name} area`,
          industryId: industry.id,
          metropolitanAreaId: metro.id,
          revenueMin: 600000,
          revenueMax: 5000000,
          employeeCountMin: 5,
          employeeCountMax: 100,
          adariskLevel: industry.adariskLevel,
          techMaturityScore: industry.techOrientationScore,
          averageWebsiteAgeYears: 8.5,
          estimatedAnnualWcagSpend: 2000,
          estimatedSalesCycle: 45,
          closingRate: 0.18,
          estimatedTAM: Math.floor(metro.smbs * 0.08),
          estimatedSOM: Math.floor(metro.smbs * 0.02),
          commonPains: JSON.stringify([
            'ADA compliance risk',
            'Outdated website',
            'Low online bookings/sales',
            'Poor mobile experience',
            'No automated systems',
          ]),
          keyMotivations: JSON.stringify([
            'Avoid lawsuits',
            'Increase revenue',
            'Look modern',
            'Attract customers',
            'Improve reputation',
          ]),
          idealMessage: `Protect ${industry.name} from ADA lawsuits while increasing online revenue`,
          competitiveAdvantage: 'Fast 72-hour implementation with compliance guarantee',
        },
      });

      icpProfiles.push(icpProfile);
      icpCount++;
    }
  }

  console.log(`✅ Created ${icpCount} ICP profiles\n`);

  // ============================================================================
  // 5. CREATE SAMPLE BUSINESSES WITH METADATA & CONTACTS
  // ============================================================================

  console.log('🏢 Creating 1000+ sample businesses with metadata and contacts...');

  const businessNames = {
    'Dental Practices': ['Smile Dental', 'Advanced Dental Care', 'Family Dental', 'Bright Smile', 'Modern Dentistry'],
    'Medical Practices': ['Premier Medical', 'Health Plus', 'Medical Associates', 'Primary Care', 'Family Medicine'],
    'Law Firms': ['Legal Associates', 'Smith & Associates', 'Law Partners', 'Justice Law', 'Defense Legal'],
    'Financial Services': ['Wealth Advisors', 'Financial Partners', 'Investment Group', 'CPA Services', 'Accounting Plus'],
    'Real Estate': ['Property Management', 'Realty Services', 'Real Estate Group', 'Home Sales', 'Property Solutions'],
    'Manufacturing': ['Industrial Solutions', 'Manufacturing Corp', 'Parts Company', 'Factory Services', 'Industrial Group'],
    'Restaurants': ['Local Bistro', 'Family Restaurant', 'Dining Express', 'Food Services', 'Cafe & Grill'],
    'Retail': ['Local Store', 'Retail Group', 'Shopping Center', 'Store Solutions', 'Retail Plus'],
    'Auto Repair': ['Auto Service', 'Repair Shop', 'Automotive', 'Car Care', 'Auto Solutions'],
    'Hair Salons': ['Hair Studio', 'Salon Express', 'Beauty Services', 'Hair Design', 'Style Studio'],
  };

  let businessCount = 0;

  // Sample 200 random metro-industry combos for demo (to keep seed time reasonable)
  const sampleSize = Math.min(200, icpProfiles.length);
  const sampledICPs = icpProfiles.sort(() => 0.5 - Math.random()).slice(0, sampleSize);

  for (const icp of sampledICPs) {
    const industry = industries.find((i) => i.id === icp.industryId);
    const metro = createdMetros.find((m) => m.id === icp.metropolitanAreaId);

    if (!industry || !metro) continue;

    // Create 3-5 businesses per ICP
    const numBusinesses = Math.floor(Math.random() * 3) + 3;

    for (let i = 0; i < numBusinesses; i++) {
      const baseNames = businessNames[industry.name as keyof typeof businessNames] || [industry.name];
      const baseName = baseNames[Math.floor(Math.random() * baseNames.length)];
      const businessName = `${baseName} - ${metro.name.split(' ')[0]} #${i + 1}`;
      const website = `${baseName.toLowerCase().replace(/\s+/g, '')}-${metro.marketCode}-${i + 1}.com`;

      try {
        const business = await prisma.targetBusiness.upsert({
          where: { website },
          update: {},
          create: {
            name: businessName,
            website,
            industryId: industry.id,
            location: `${metro.name}`,
            city: metro.name.split(' ')[0],
            state: 'XX', // Placeholder
            revenue: Math.floor(Math.random() * 4000000) + 600000,
            employeeCount: Math.floor(Math.random() * 80) + 5,
            ownerName: `Owner ${i + 1}`,
            email: `owner${i + 1}@${website}`,
            phone: `555-0${100 + i}`,
            matchScore: Math.random() * 0.4 + 0.6,
            wcagScore: Math.random() * 40 + 30,
            wcagViolationCount: Math.floor(Math.random() * 15) + 3,
            outreachStatus: 'not_contacted',
            notes: `${industry.name} in ${metro.name} area`,
          },
        });

        // Create metadata
        await prisma.targetBusinessMetadata.upsert({
          where: { businessId: business.id },
          update: {},
          create: {
            businessId: business.id,
            metropolitanAreaId: metro.id,
            icpProfileId: icp.id,
            icpMatchScore: icp.estimatedTAM > 0 ? Math.random() * 0.4 + 0.6 : 0.5,
            estimatedDecisionCycle: 30 + Math.floor(Math.random() * 30),
            buyingSignals: JSON.stringify(['website outdated', 'no mobile support']),
          },
        });

        // Create 2-3 decision maker contacts for each business
        for (const dm of decisionMakers.slice(0, Math.floor(Math.random() * 2) + 2)) {
          await prisma.contactPerson.upsert({
            where: {
              businessId_decisionMakerId_email: {
                businessId: business.id,
                decisionMakerId: dm.id,
                email: `${dm.role}@${website}`,
              },
            },
            update: {},
            create: {
              businessId: business.id,
              decisionMakerId: dm.id,
              firstName: dm.title.split('/')[0].trim(),
              lastName: 'Smith',
              jobTitle: dm.title,
              email: `${dm.role}@${website}`,
              phone: `555-0${100 + i}`,
              outreachStatus: 'not_contacted',
            },
          });
        }

        businessCount++;
      } catch (e) {
        // Silently skip duplicates
      }
    }
  }

  console.log(`✅ Created ${businessCount} sample businesses with contacts\n`);

  // ============================================================================
  // 6. SUMMARY
  // ============================================================================

  const finalStats = await Promise.all([
    prisma.metropolitanArea.count(),
    prisma.industry.count(),
    prisma.idealCustomerProfile.count(),
    prisma.targetBusiness.count(),
    prisma.decisionMaker.count(),
    prisma.contactPerson.count(),
  ]);

  console.log('📊 Final Seed Summary:');
  console.log(`   Metropolitan Areas: ${finalStats[0]}`);
  console.log(`   Industries: ${finalStats[1]}`);
  console.log(`   ICP Profiles: ${finalStats[2]}`);
  console.log(`   Target Businesses: ${finalStats[3]}`);
  console.log(`   Decision Maker Personas: ${finalStats[4]}`);
  console.log(`   Contact People: ${finalStats[5]}`);
  console.log('');
  console.log('🎉 Comprehensive ICP + Geographic seed complete!');
  console.log('');
  console.log('Ready for advanced targeting queries:');
  console.log('   - Find SMBs matching ICP in specific metro');
  console.log('   - Identify decision makers by role');
  console.log('   - Geographic clustering analysis');
  console.log('   - Persona-based outreach campaigns');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
