// config.example.js
// Example configuration for fintech workflow testing
// Copy this to config.js and fill in your API keys

module.exports = {
  // Bing Web Search API
  // Get your key: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
  bingApiKey: process.env.BING_API_KEY || 'YOUR_BING_API_KEY_HERE',
  
  // Fellou Accessibility Scanning API
  // Get your token: https://fellou.com (or use local Axe-core)
  fellouToken: process.env.FELLOU_TOKEN || 'YOUR_FELLOU_TOKEN_HERE',
  
  // Resend Email API
  // Get your key: https://resend.com
  resendApiKey: process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY_HERE',
  
  // Fintech-specific keywords for prospect discovery
  fintechKeywords: [
    'fintech company',
    'digital payment platform',
    'online banking',
    'cryptocurrency exchange',
    'investment app',
    'personal finance software',
    'payment processing',
    'mobile wallet',
    'peer-to-peer payment',
    'robo-advisor'
  ],
  
  // Domain filters (only include these domains)
  allowedDomains: [
    'stripe.com',
    'square.com',
    'paypal.com',
    'robinhood.com',
    'coinbase.com',
    'sofi.com',
    'chime.com',
    'venmo.com',
    'cashapp.com',
    'plaid.com'
  ],
  
  // Scanning configuration
  scanConfig: {
    standard: 'WCAG21AA',
    timeout: 30000,
    maxConcurrent: 3,
    retries: 2
  },
  
  // Email configuration
  emailConfig: {
    fromEmail: 'compliance@wcagai.com',
    fromName: 'WCAG AI Platform',
    replyTo: 'support@wcagai.com',
    subject: 'Accessibility Compliance Report - {{companyName}}',
    template: 'fintech-compliance'
  },
  
  // Database configuration
  database: {
    prospectKey: 'prospects:finance',
    scanResultsKey: 'scans:finance',
    emailLogKey: 'emails:finance'
  }
};
