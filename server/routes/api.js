const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dbModule = require('../database');
// dbModule is our Database wrapper instance; use it directly (NOT dbModule.db which is the raw sql.js object)
const db = dbModule;

// GET /profile - return first row from profile table
router.get('/profile', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM profile LIMIT 1').get();
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /skills - return all skills ordered by sort_order. Group by category in JS before returning.
router.get('/skills', (req, res) => {
  try {
    const skills = db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, id ASC').all();
    const groupedSkills = skills.reduce((acc, skill) => {
      const category = skill.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    }, {});
    res.json(groupedSkills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /projects - return all projects ordered by sort_order
router.get('/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, id ASC').all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /education - return all education entries ordered by sort_order
router.get('/education', (req, res) => {
  try {
    const education = db.prepare('SELECT * FROM education ORDER BY sort_order ASC, id ASC').all();
    res.json(education);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /certificates - return all certificates ordered by sort_order
router.get('/certificates', (req, res) => {
  try {
    const certificates = db.prepare('SELECT * FROM certificates ORDER BY sort_order ASC, id ASC').all();
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /resume/download - read resume_path from profile, send that file. If no resume, return 404 with message.
router.get('/resume/download', (req, res) => {
  try {
    const profile = db.prepare('SELECT resume_path FROM profile LIMIT 1').get();
    if (!profile || !profile.resume_path) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const cleanPath = profile.resume_path.startsWith('/') ? profile.resume_path.slice(1) : profile.resume_path;
    const filePath = path.resolve(__dirname, '../../public', cleanPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file not found on server' });
    }

    const downloadName = 'Resume' + (path.extname(filePath) || '.pdf');
    res.download(filePath, downloadName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /contact - validate name, email, subject, message (all required, validate email with regex). Insert into contact_messages. Return success message.
router.post('/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const stmt = db.prepare(`
      INSERT INTO contact_messages (name, email, subject, message, created_at, is_read)
      VALUES (?, ?, ?, ?, datetime('now'), 0)
    `);
    const result = stmt.run(name.trim(), email.trim(), subject.trim(), message.trim());

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      id: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
