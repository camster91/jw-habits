// Main entry point for deployment platforms
// This file redirects to the actual backend server

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import and start the backend server
const backendPath = join(__dirname, 'backend', 'src', 'server.js');

console.log('🚀 Starting JW News PWA backend...');
console.log('📁 Backend location:', backendPath);

// Import and execute the backend server
import(backendPath)
  .then(() => {
    console.log('✅ Backend server loaded successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to start backend server:', error);
    process.exit(1);
  });
