require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directories on startup if they don't exist
const uploadDirs = [
  path.join(__dirname, '../public/uploads/profile'),
  path.join(__dirname, '../public/uploads/projects'),
  path.join(__dirname, '../public/uploads/certificates'),
  path.join(__dirname, '../public/uploads/resume')
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from ../public
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database then start server
const database = require('./database');

database.init().then(() => {
  console.log('Database initialized successfully.');

  // Import route files AFTER database is ready
  const apiRoutes = require('./routes/api');
  const adminRoutes = require('./routes/admin');

  // Mount API routes
  app.use('/api', apiRoutes);
  app.use('/api/admin', adminRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal Server Error'
      }
    });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`\n  🚀 Portfolio Server Running!`);
    console.log(`  ➜ Portfolio:  http://localhost:${PORT}`);
    console.log(`  ➜ Admin:      http://localhost:${PORT}/admin.html`);
    console.log(`  ➜ API:        http://localhost:${PORT}/api/profile\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
