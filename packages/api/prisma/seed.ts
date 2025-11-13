/**
 * Database Seed Script - Comprehensive Target Demographics
 * Populates target demographics with 25+ industries across 10 major US cities
 * Includes healthcare, legal, financial, trades, hospitality, and service industries
 *
 * Run with: npm run seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // ============================================================================
  // 1. CREATE 25+ INDUSTRIES
  // ============================================================================

  console.log('📋 Creating 25+ industries...');

  const industriesData = [
    // PRIMARY: Healthcare (HIGH RISK)
    {
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
      notes: '90% have non-responsive websites, high ADA lawsuit risk',
    },
    {
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
      notes: '300% increase in ADA lawsuits since 2020, high revenue',
    },
    {
      name: 'Physical Therapy Practices',
      description: 'PT clinics and rehabilitation centers',
      adariskLevel: 'high',
      typicalRevenueMin: 800000,
      typicalRevenueMax: 3000000,
      typicalEmployeeMin: 5,
      typicalEmployeeMax: 20,
      techOrientationScore: 0.32,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Elderly and disabled clientele, accessibility critical',
    },
    {
      name: 'Optometry & Eye Care',
      description: 'Eye doctors and optometry offices',
      adariskLevel: 'high',
      typicalRevenueMin: 1200000,
      typicalRevenueMax: 4000000,
      typicalEmployeeMin: 4,
      typicalEmployeeMax: 15,
      techOrientationScore: 0.3,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Serve visually-impaired patients, ironic accessibility gaps',
    },
    {
      name: 'Veterinary Practices',
      description: 'Veterinary clinics and animal hospitals',
      adariskLevel: 'medium',
      typicalRevenueMin: 600000,
      typicalRevenueMax: 2500000,
      typicalEmployeeMin: 4,
      typicalEmployeeMax: 15,
      techOrientationScore: 0.28,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Often family-run, outdated payment/booking systems',
    },
    {
      name: 'Healthcare Administration',
      description: 'Medical billing, practice management, healthcare consulting',
      adariskLevel: 'high',
      typicalRevenueMin: 1000000,
      typicalRevenueMax: 10000000,
      typicalEmployeeMin: 10,
      typicalEmployeeMax: 50,
      techOrientationScore: 0.35,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'B2B healthcare, compliance-focused, high value targets',
    },

    // SECONDARY: Legal & Professional Services (HIGH RISK)
    {
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
      notes: 'Understand ADA risk, outdated WordPress sites common',
    },
    {
      name: 'Accounting & CPA Firms',
      description: 'Certified public accountants and tax preparation',
      adariskLevel: 'medium',
      typicalRevenueMin: 800000,
      typicalRevenueMax: 4000000,
      typicalEmployeeMin: 5,
      typicalEmployeeMax: 25,
      techOrientationScore: 0.38,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Serve small businesses, need to model compliance',
    },
    {
      name: 'Insurance Agencies',
      description: 'Independent insurance brokers and agents',
      adariskLevel: 'medium',
      typicalRevenueMin: 500000,
      typicalRevenueMax: 3000000,
      typicalEmployeeMin: 3,
      typicalEmployeeMax: 20,
      techOrientationScore: 0.32,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Legacy systems, compliance-regulated industry',
    },

    // SECONDARY: Financial Services (MEDIUM RISK)
    {
      name: 'Financial Services & Wealth Management',
      description: 'Wealth managers, financial advisors, RIA firms',
      adariskLevel: 'medium',
      typicalRevenueMin: 1500000,
      typicalRevenueMax: 5000000,
      typicalEmployeeMin: 8,
      typicalEmployeeMax: 30,
      techOrientationScore: 0.42,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Elderly clientele, trust-critical, accessible statements needed',
    },
    {
      name: 'Real Estate Agencies',
      description: 'Real estate agencies and property management firms',
      adariskLevel: 'medium',
      typicalRevenueMin: 500000,
      typicalRevenueMax: 5000000,
      typicalEmployeeMin: 5,
      typicalEmployeeMax: 40,
      techOrientationScore: 0.4,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Visual content accessibility critical, image alt-text issues',
    },

    // SECONDARY: Manufacturing & Industrial (MEDIUM RISK, BLUE COLLAR)
    {
      name: 'Manufacturing & Industrial',
      description: 'Small to mid-sized manufacturing and industrial companies',
      adariskLevel: 'medium',
      typicalRevenueMin: 5000000,
      typicalRevenueMax: 50000000,
      typicalEmployeeMin: 20,
      typicalEmployeeMax: 100,
      techOrientationScore: 0.25,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Flash catalogs common, Section 508 compliance for federal contracts',
    },
    {
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
      notes: 'Talent acquisition challenges, need to attract young engineers',
    },
    {
      name: 'Construction Companies',
      description: 'General contractors and construction firms',
      adariskLevel: 'medium',
      typicalRevenueMin: 2000000,
      typicalRevenueMax: 20000000,
      typicalEmployeeMin: 15,
      typicalEmployeeMax: 100,
      techOrientationScore: 0.2,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Offline-oriented, project-based, portfolio showcase needed',
    },

    // SECONDARY: Trades & Service (MEDIUM RISK, BLUE COLLAR)
    {
      name: 'HVAC Services',
      description: 'Heating, ventilation, and air conditioning contractors',
      adariskLevel: 'low',
      typicalRevenueMin: 500000,
      typicalRevenueMax: 5000000,
      typicalEmployeeMin: 3,
      typicalEmployeeMax: 30,
      techOrientationScore: 0.15,
      techAdoptionSpeed: 'very_slow',
      isBlueCollar: true,
      notes: 'Service-area based, need local SEO and booking',
    },
    {
      name: 'Plumbing Services',
      description: 'Licensed plumbing contractors and services',
      adariskLevel: 'low',
      typicalRevenueMin: 400000,
      typicalRevenueMax: 3000000,
      typicalEmployeeMin: 2,
      typicalEmployeeMax: 20,
      techOrientationScore: 0.12,
      techAdoptionSpeed: 'very_slow',
      isBlueCollar: true,
      notes: 'Often owner-operated, need simple website with phone',
    },
    {
      name: 'Electrical Services',
      description: 'Licensed electricians and electrical contractors',
      adariskLevel: 'low',
      typicalRevenueMin: 500000,
      typicalRevenueMax: 4000000,
      typicalEmployeeMin: 3,
      typicalEmployeeMax: 25,
      techOrientationScore: 0.14,
      techAdoptionSpeed: 'very_slow',
      isBlueCollar: true,
      notes: 'Service contractors, minimal online presence common',
    },
    {
      name: 'Auto Repair & Service',
      description: 'Auto repair shops and automotive service centers',
      adariskLevel: 'low',
      typicalRevenueMin: 400000,
      typicalRevenueMax: 2500000,
      typicalEmployeeMin: 3,
      typicalEmployeeMax: 15,
      techOrientationScore: 0.18,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Family businesses, need online appointment booking',
    },

    // TERTIARY: Hospitality & Food Service (MEDIUM RISK)
    {
      name: 'Restaurants & Food Service',
      description: 'Restaurants with multiple locations, catering services',
      adariskLevel: 'medium',
      typicalRevenueMin: 1000000,
      typicalRevenueMax: 20000000,
      typicalEmployeeMin: 15,
      typicalEmployeeMax: 200,
      techOrientationScore: 0.2,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Inaccessible PDF menus common, Domino\'s lawsuit precedent',
    },
    {
      name: 'Hotels & Hospitality',
      description: 'Hotels, motels, bed & breakfasts, vacation rentals',
      adariskLevel: 'medium',
      typicalRevenueMin: 1500000,
      typicalRevenueMax: 15000000,
      typicalEmployeeMin: 20,
      typicalEmployeeMax: 150,
      techOrientationScore: 0.28,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Booking critical, accessibility impacts reservations',
    },
    {
      name: 'Travel Agencies',
      description: 'Independent travel agencies and travel consultants',
      adariskLevel: 'low',
      typicalRevenueMin: 300000,
      typicalRevenueMax: 2000000,
      typicalEmployeeMin: 2,
      typicalEmployeeMax: 12,
      techOrientationScore: 0.35,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Legacy systems, specialized booking, older clientele',
    },

    // TERTIARY: Retail & Consumer (MEDIUM RISK)
    {
      name: 'Retail Stores',
      description: 'Multi-location retail stores and shopping centers',
      adariskLevel: 'medium',
      typicalRevenueMin: 5000000,
      typicalRevenueMax: 50000000,
      typicalEmployeeMin: 30,
      typicalEmployeeMax: 500,
      techOrientationScore: 0.3,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Volume opportunity, standardized compliance solution needed',
    },
    {
      name: 'Hair Salons & Barbershops',
      description: 'Hair salons, barbershops, and beauty services',
      adariskLevel: 'low',
      typicalRevenueMin: 200000,
      typicalRevenueMax: 1500000,
      typicalEmployeeMin: 2,
      typicalEmployeeMax: 15,
      techOrientationScore: 0.2,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Appointment-based, simple booking needed',
    },
    {
      name: 'Fitness Centers & Gyms',
      description: 'Gyms, fitness studios, and wellness centers',
      adariskLevel: 'low',
      typicalRevenueMin: 300000,
      typicalRevenueMax: 2500000,
      typicalEmployeeMin: 4,
      typicalEmployeeMax: 30,
      techOrientationScore: 0.32,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Membership management, accessibility features important',
    },
    {
      name: 'Print Shops',
      description: 'Printing and copying services',
      adariskLevel: 'low',
      typicalRevenueMin: 300000,
      typicalRevenueMax: 2000000,
      typicalEmployeeMin: 2,
      typicalEmployeeMax: 12,
      techOrientationScore: 0.22,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Order management, estimate tools need accessibility',
    },
    {
      name: 'Photography & Design Studios',
      description: 'Photography, graphic design, and creative services',
      adariskLevel: 'low',
      typicalRevenueMin: 400000,
      typicalRevenueMax: 2000000,
      typicalEmployeeMin: 1,
      typicalEmployeeMax: 10,
      techOrientationScore: 0.55,
      techAdoptionSpeed: 'medium',
      isBlueCollar: false,
      notes: 'Portfolio critical, image accessibility issues',
    },
    {
      name: 'Florists',
      description: 'Flower shops and floral design services',
      adariskLevel: 'low',
      typicalRevenueMin: 200000,
      typicalRevenueMax: 1200000,
      typicalEmployeeMin: 2,
      typicalEmployeeMax: 8,
      techOrientationScore: 0.18,
      techAdoptionSpeed: 'slow',
      isBlueCollar: true,
      notes: 'Seasonal, delivery-based, ordering accessibility needed',
    },
    {
      name: 'Funeral Homes & Cremation Services',
      description: 'Funeral homes and cremation services',
      adariskLevel: 'medium',
      typicalRevenueMin: 600000,
      typicalRevenueMax: 3000000,
      typicalEmployeeMin: 3,
      typicalEmployeeMax: 20,
      techOrientationScore: 0.2,
      techAdoptionSpeed: 'slow',
      isBlueCollar: false,
      notes: 'Sensitive information, elderly and grieving visitors',
    },

    // OTHER: IT & Tech (LOW RISK but included for completeness)
    {
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
      notes: 'Know ADA compliance but may have their own issues',
    },
  ];

  const industries = await Promise.all(
    industriesData.map((data) =>
      prisma.industry.upsert({
        where: { name: data.name },
        update: {},
        create: data,
      })
    )
  );

  console.log(`✅ Created ${industries.length} industries\n`);

  // ============================================================================
  // 2. CREATE SAMPLE BUSINESSES (MULTI-CITY)
  // ============================================================================

  console.log('🏢 Creating sample target businesses across 10 cities...');

  // Build business data
  const sampleBusinessesData = [
    // Medical Practices across cities
    {
      name: 'Advanced Medical Care - Pittsburgh',
      website: 'advancedmedical-pgh.com',
      industryName: 'Medical Practices',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 3500000,
      employeeCount: 24,
      ownerName: 'Dr. James Mitchell',
      email: 'james@advancedmedical.com',
      matchScore: 0.9,
      notes: 'Multi-specialty practice, non-responsive site',
    },
    {
      name: 'Urban Health Center - Philadelphia',
      website: 'urbanhealthcenter-philly.com',
      industryName: 'Medical Practices',
      city: 'Philadelphia',
      state: 'PA',
      revenue: 2800000,
      employeeCount: 18,
      ownerName: 'Dr. Maria Rodriguez',
      email: 'maria@urbanhealthcenter.com',
      matchScore: 0.88,
      notes: 'Primary care focus, outdated site from 2015',
    },
    {
      name: 'Park Avenue Medical - New York',
      website: 'parkavenuemed-ny.com',
      industryName: 'Medical Practices',
      city: 'New York',
      state: 'NY',
      revenue: 4200000,
      employeeCount: 32,
      ownerName: 'Dr. Richard Chen',
      email: 'richard@parkavenuemed.com',
      matchScore: 0.92,
      notes: 'Upper East Side location, luxury brand but inaccessible',
    },

    // Dental Practices across cities
    {
      name: 'Smile Perfect Dental - Chicago',
      website: 'smileperfect-chicago.com',
      industryName: 'Dental Practices',
      city: 'Chicago',
      state: 'IL',
      revenue: 2600000,
      employeeCount: 14,
      ownerName: 'Dr. Susan Park',
      email: 'susan@smileperfect.com',
      matchScore: 0.89,
      notes: 'Downtown location, PDF brochures not accessible',
    },
    {
      name: 'Family Dental Care - Houston',
      website: 'familydental-houston.com',
      industryName: 'Dental Practices',
      city: 'Houston',
      state: 'TX',
      revenue: 2100000,
      employeeCount: 10,
      ownerName: 'Dr. Thomas Williams',
      email: 'thomas@familydental.com',
      matchScore: 0.85,
      notes: 'Cosmetic and general dentistry, no alt text on images',
    },
    {
      name: 'Bright Smile Orthodontics - Los Angeles',
      website: 'brightsmile-la.com',
      industryName: 'Dental Practices',
      city: 'Los Angeles',
      state: 'CA',
      revenue: 3100000,
      employeeCount: 16,
      ownerName: 'Dr. David Kim',
      email: 'david@brightsmile.com',
      matchScore: 0.87,
      notes: 'Specializes in Invisalign, WordPress theme not accessible',
    },

    // Physical Therapy
    {
      name: 'Recovery Plus PT - Denver',
      website: 'recoveryplus-denver.com',
      industryName: 'Physical Therapy Practices',
      city: 'Denver',
      state: 'CO',
      revenue: 1800000,
      employeeCount: 12,
      ownerName: 'Jennifer Taylor',
      email: 'jen@recoveryplus.com',
      matchScore: 0.82,
      notes: 'Sports and orthopedic PT, form accessibility issues',
    },

    // Law Firms
    {
      name: 'Johnson & Associates Law - Seattle',
      website: 'johnsonlaw-seattle.com',
      industryName: 'Law Firms',
      city: 'Seattle',
      state: 'WA',
      revenue: 2400000,
      employeeCount: 14,
      ownerName: 'Attorney James Johnson',
      email: 'james@johnsonlaw.com',
      matchScore: 0.88,
      notes: 'Personal injury law, PDF service descriptions',
    },
    {
      name: 'Atlantic Legal Group - New York',
      website: 'atlanticlegal-ny.com',
      industryName: 'Law Firms',
      city: 'New York',
      state: 'NY',
      revenue: 3800000,
      employeeCount: 22,
      ownerName: 'Attorney Patricia Williams',
      email: 'patricia@atlanticlegal.com',
      matchScore: 0.91,
      notes: 'Corporate law, partner photos no alt text',
    },
    {
      name: 'Midwest Legal Solutions - Chicago',
      website: 'midwestlegal-chi.com',
      industryName: 'Law Firms',
      city: 'Chicago',
      state: 'IL',
      revenue: 2200000,
      employeeCount: 12,
      ownerName: 'Attorney Michael Torres',
      email: 'michael@midwestlegal.com',
      matchScore: 0.84,
      notes: 'Estate planning focus, non-responsive design',
    },

    // Financial Services
    {
      name: 'Premier Wealth Advisors - Atlanta',
      website: 'premierwealth-atlanta.com',
      industryName: 'Financial Services & Wealth Management',
      city: 'Atlanta',
      state: 'GA',
      revenue: 4000000,
      employeeCount: 20,
      ownerName: 'David Henderson',
      email: 'david@premierwealth.com',
      matchScore: 0.87,
      notes: 'RIA firm, elderly clientele, brochureware site',
    },
    {
      name: 'Gateway Financial Group - Phoenix',
      website: 'gatewayfinancial-phx.com',
      industryName: 'Financial Services & Wealth Management',
      city: 'Phoenix',
      state: 'AZ',
      revenue: 2900000,
      employeeCount: 16,
      ownerName: 'Elizabeth Martinez',
      email: 'elizabeth@gatewayfinancial.com',
      matchScore: 0.83,
      notes: 'Financial planning and investment services',
    },

    // Restaurants
    {
      name: 'Urban Bistro - Boston',
      website: 'urbanbistro-boston.com',
      industryName: 'Restaurants & Food Service',
      city: 'Boston',
      state: 'MA',
      revenue: 2100000,
      employeeCount: 22,
      ownerName: 'Chef Marco Rossi',
      email: 'marco@urbanbistro.com',
      matchScore: 0.68,
      notes: 'PDF menus not accessible, online ordering inaccessible',
    },

    // Manufacturing
    {
      name: 'Precision Manufacturing Solutions - Pittsburgh',
      website: 'precisionmfg-pgh.com',
      industryName: 'Manufacturing & Industrial',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 15000000,
      employeeCount: 58,
      ownerName: 'Robert Chen',
      email: 'robert@precisionmfg.com',
      matchScore: 0.76,
      notes: 'Federal contractor, Section 508 compliance needed',
    },
    {
      name: 'Industrial Components Inc - Chicago',
      website: 'industrialcomp-chicago.com',
      industryName: 'Manufacturing & Industrial',
      city: 'Chicago',
      state: 'IL',
      revenue: 12000000,
      employeeCount: 45,
      ownerName: 'James Patterson',
      email: 'james@industrialcomp.com',
      matchScore: 0.72,
      notes: 'Parts supplier, Flash product catalog',
    },

    // Construction
    {
      name: 'BuildRight Construction - Denver',
      website: 'buildright-denver.com',
      industryName: 'Construction Companies',
      city: 'Denver',
      state: 'CO',
      revenue: 8500000,
      employeeCount: 32,
      ownerName: 'Michael O\'Brien',
      email: 'michael@buildright.com',
      matchScore: 0.69,
      notes: 'General contractor, portfolio gallery not accessible',
    },

    // Retail
    {
      name: 'Local Market Chain - Philadelphia',
      website: 'localmarket-philly.com',
      industryName: 'Retail Stores',
      city: 'Philadelphia',
      state: 'PA',
      revenue: 18000000,
      employeeCount: 85,
      ownerName: 'Sarah Goldman',
      email: 'sarah@localmarket.com',
      matchScore: 0.71,
      notes: '12 locations, centralized site but inaccessible',
    },

    // HVAC
    {
      name: 'Cool Comfort HVAC - Seattle',
      website: 'coolcomfort-seattle.com',
      industryName: 'HVAC Services',
      city: 'Seattle',
      state: 'WA',
      revenue: 2200000,
      employeeCount: 14,
      ownerName: 'Tom Richardson',
      email: 'tom@coolcomfort.com',
      matchScore: 0.55,
      notes: 'Service-based, needs appointment scheduling',
    },

    // Auto Repair
    {
      name: 'Elite Auto Repair - Los Angeles',
      website: 'eliteautorepair-la.com',
      industryName: 'Auto Repair & Service',
      city: 'Los Angeles',
      state: 'CA',
      revenue: 1400000,
      employeeCount: 8,
      ownerName: 'Carlos Mendez',
      email: 'carlos@eliteautorepair.com',
      matchScore: 0.58,
      notes: 'Family shop, basic site, appointment booking needed',
    },

    // Fitness
    {
      name: 'FitLife Gym - Houston',
      website: 'fitlifegym-houston.com',
      industryName: 'Fitness Centers & Gyms',
      city: 'Houston',
      state: 'TX',
      revenue: 1800000,
      employeeCount: 18,
      ownerName: 'Jessica Lee',
      email: 'jessica@fitlifegym.com',
      matchScore: 0.61,
      notes: 'Membership management, class scheduling issues',
    },

    // Real Estate
    {
      name: 'Premier Properties - Phoenix',
      website: 'premierproperties-phx.com',
      industryName: 'Real Estate Agencies',
      city: 'Phoenix',
      state: 'AZ',
      revenue: 3200000,
      employeeCount: 24,
      ownerName: 'Nancy Stewart',
      email: 'nancy@premierproperties.com',
      matchScore: 0.74,
      notes: 'Photo galleries not accessible, MLS integration issues',
    },

    // CPA
    {
      name: 'Strategic Accounting Group - Atlanta',
      website: 'strategicacct-atlanta.com',
      industryName: 'Accounting & CPA Firms',
      city: 'Atlanta',
      state: 'GA',
      revenue: 2100000,
      employeeCount: 12,
      ownerName: 'William Chen',
      email: 'william@strategicacct.com',
      matchScore: 0.77,
      notes: 'Tax and business accounting, form accessibility',
    },

    // Insurance
    {
      name: 'Trusted Insurance Solutions - Denver',
      website: 'trustedins-denver.com',
      industryName: 'Insurance Agencies',
      city: 'Denver',
      state: 'CO',
      revenue: 1500000,
      employeeCount: 9,
      ownerName: 'Robert Martinez',
      email: 'robert@trustedins.com',
      matchScore: 0.66,
      notes: 'Independent broker, quote forms not accessible',
    },

    // Travel Agency
    {
      name: 'Dream Vacations Travel - Seattle',
      website: 'dreamvactravel-seattle.com',
      industryName: 'Travel Agencies',
      city: 'Seattle',
      state: 'WA',
      revenue: 900000,
      employeeCount: 5,
      ownerName: 'Linda Thompson',
      email: 'linda@dreamvactravel.com',
      matchScore: 0.59,
      notes: 'Independent agency, booking system accessibility',
    },

    // Photography
    {
      name: 'Creative Vision Studios - New York',
      website: 'creativevision-ny.com',
      industryName: 'Photography & Design Studios',
      city: 'New York',
      state: 'NY',
      revenue: 1200000,
      employeeCount: 4,
      ownerName: 'Amanda Walsh',
      email: 'amanda@creativevision.com',
      matchScore: 0.64,
      notes: 'Photography and design, portfolio gallery issues',
    },

    // Hair Salon
    {
      name: 'Salon Elite - Los Angeles',
      website: 'salonelite-la.com',
      industryName: 'Hair Salons & Barbershops',
      city: 'Los Angeles',
      state: 'CA',
      revenue: 850000,
      employeeCount: 7,
      ownerName: 'Victoria Martinez',
      email: 'victoria@salonelite.com',
      matchScore: 0.52,
      notes: 'Upscale salon, booking and services inaccessible',
    },

    // Funeral Home
    {
      name: 'Peaceful Rest Funeral Home - Chicago',
      website: 'peacefulrest-chicago.com',
      industryName: 'Funeral Homes & Cremation Services',
      city: 'Chicago',
      state: 'IL',
      revenue: 1800000,
      employeeCount: 11,
      ownerName: 'Joseph Romano',
      email: 'joseph@peacefulrest.com',
      matchScore: 0.70,
      notes: 'Family business, services listing needs accessibility',
    },

    // Engineering
    {
      name: 'Advanced Engineering Solutions - Pittsburgh',
      website: 'adveng-pgh.com',
      industryName: 'Engineering Consulting',
      city: 'Pittsburgh',
      state: 'PA',
      revenue: 9500000,
      employeeCount: 42,
      ownerName: 'Dr. Sarah Anderson',
      email: 'sarah@adveng.com',
      matchScore: 0.78,
      notes: 'Structural and civil engineering, project portfolio',
    },

    // Hotel
    {
      name: 'Riverside Hotel Group - Phoenix',
      website: 'riversidehotel-phx.com',
      industryName: 'Hotels & Hospitality',
      city: 'Phoenix',
      state: 'AZ',
      revenue: 12000000,
      employeeCount: 78,
      ownerName: 'Eric Thompson',
      email: 'eric@riversidehotel.com',
      matchScore: 0.72,
      notes: '8 property group, booking system accessibility',
    },
  ];

  const businesses = await Promise.all(
    sampleBusinessesData.map(async (biz) => {
      const industry = industries.find((i) => i.name === biz.industryName);
      if (!industry) return null;

      return prisma.targetBusiness.upsert({
        where: { website: biz.website },
        update: {},
        create: {
          name: biz.name,
          website: biz.website,
          industryId: industry.id,
          location: `${biz.city}, ${biz.state}`,
          city: biz.city,
          state: biz.state,
          revenue: biz.revenue,
          employeeCount: biz.employeeCount,
          ownerName: biz.ownerName,
          email: biz.email,
          matchScore: biz.matchScore,
          notes: biz.notes,
        },
      });
    })
  );

  const validBusinesses = businesses.filter((b) => b !== null);
  console.log(`✅ Created ${validBusinesses.length} sample businesses across 10 cities\n`);

  // ============================================================================
  // 3. ADD SAMPLE VIOLATIONS
  // ============================================================================

  console.log('⚠️  Adding sample WCAG violations...');

  let violationCount = 0;
  for (const business of validBusinesses.slice(0, 15)) {
    if (!business) continue;

    const violations = [
      { wcagCriteria: '1.4.3', severity: 'critical', description: 'Insufficient color contrast' },
      { wcagCriteria: '1.1.1', severity: 'high', description: 'Missing alt text on images' },
      { wcagCriteria: '2.1.1', severity: 'high', description: 'Form not keyboard accessible' },
      { wcagCriteria: '2.4.3', severity: 'high', description: 'Focus indicator not visible' },
      { wcagCriteria: '1.3.1', severity: 'medium', description: 'Form labels not associated' },
    ];

    const selectedViolations = violations.slice(0, Math.floor(Math.random() * 3) + 2);

    for (const v of selectedViolations) {
      await prisma.targetBusinessViolation.create({
        data: {
          businessId: business.id,
          ...v,
          count: 1,
        },
      });
      violationCount++;
    }

    // Update violation count
    const vCount = await prisma.targetBusinessViolation.count({
      where: { businessId: business.id },
    });

    await prisma.targetBusiness.update({
      where: { id: business.id },
      data: {
        wcagViolationCount: vCount,
        wcagScore: Math.max(30, 100 - vCount * 8),
      },
    });
  }

  console.log(`✅ Added ${violationCount} sample violations\n`);

  // ============================================================================
  // 4. SUMMARY
  // ============================================================================

  const stats = await prisma.industry.count();
  const bizCount = await prisma.targetBusiness.count();
  const violCount = await prisma.targetBusinessViolation.count();

  console.log('📊 Seed Complete Summary:');
  console.log(`   Industries: ${stats}`);
  console.log(`   Businesses: ${bizCount}`);
  console.log(`   Violations: ${violCount}`);
  console.log(`   Cities: 10 major US metropolitan areas`);
  console.log('');
  console.log('🎯 Industry Breakdown:');
  const industriesByCount = await prisma.industry.findMany({
    include: { _count: { select: { targetBusinesses: true } } },
    orderBy: { targetBusinesses: { _count: 'desc' } },
  });
  industriesByCount.slice(0, 10).forEach((ind) => {
    console.log(`   - ${ind.name}: ${ind._count.targetBusinesses} businesses`);
  });
  console.log('');
  console.log('🚀 API Endpoints Ready:');
  console.log('   GET  /api/target-demographics/industries');
  console.log('   GET  /api/target-demographics/businesses');
  console.log('   POST /api/target-demographics/businesses/search');
  console.log('   GET  /api/target-demographics/statistics');
  console.log('');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
