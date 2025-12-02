const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================================
// SECURITY MIDDLEWARE
// ================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests' }
});
app.use('/api/', limiter);

// ================================================================
// PARSING & LOGGING
// ================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ================================================================
// STATIC FILES
// ================================================================

app.use('/consultant', express.static(path.join(__dirname, '../consultant-site')));
app.use('/app', express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => res.redirect('/consultant/index.html'));

// ================================================================
// API ROUTES
// ================================================================

const apiRoutes = require('./api/routes');
app.use('/api', apiRoutes);

// ================================================================
// ERROR HANDLING
// ================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

app.use((error, req, res, next) => {
  console.error('[Error]', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// ================================================================
// SERVER STARTUP
// ================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('⚡ WCAG AI PLATFORM - Backend API');
    console.log('='.repeat(60));
    console.log(`\n🌐 Server: http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n📚 API Endpoints:');
    console.log('   POST /api/scan');
    console.log('   GET  /api/scan/:scanId');
    console.log('   GET  /api/health');
    console.log('\n🎨 Frontend:');
    console.log(`   Landing: http://localhost:${PORT}/consultant/index.html`);
    console.log(`   Scanner: http://localhost:${PORT}/app/scanner.html`);
    console.log('\n' + '='.repeat(60) + '\n');
  });
}

module.exports = app;
