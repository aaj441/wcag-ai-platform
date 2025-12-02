#!/usr/bin/env node
// backend/worker.js - Dedicated Worker Process for Scan Queue

require('dotenv').config();
const { createWorker } = require('./services/queue');

console.log('='.repeat(60));
console.log('🔧 INFINITYSOUL SCAN WORKER');
console.log('='.repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
console.log(`Concurrency: ${process.env.WORKER_CONCURRENCY || 2}`);
console.log('='.repeat(60));

// Initialize worker
const worker = createWorker();

// Store globally for graceful shutdown
global.scanWorker = worker;

console.log('✅ Worker started and listening for jobs...');
console.log('Press CTRL+C to stop');

// Keep process alive
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down...');
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down...');
});
