const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dbModule = require('../database');
// dbModule is our Database wrapper instance; use it directly (NOT dbModule.db which is the raw sql.js object)
const db = dbModule;

const authModule = require('../middleware/auth');
const authMiddleware = typeof authModule === 'function'
  ? authModule
  : (authModule.authenticateToken || authModule.auth || authModule.verifyToken || authModule);

const {
  profileUpload,
  projectUpload,
  certificateUpload,
  resumeUpload
} = require('./multerConfig');

// Helper to safely delete an uploaded file from disk if it exists
const deleteFile = (relativeFilePath) => {
  if (!relativeFilePath) return;
  const cleanPath = relativeFilePath.startsWith('/') ? relativeFilePath.slice(1) : relativeFilePath;
  const absolutePath = path.resolve(__dirname, '../../public', cleanPath);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (err) {
      // Ignore deletion errors (e.g. file busy or permissions)
    }
  }
};

// ==========================================
// Public Admin Endpoint: POST /login
// ==========================================
// Look up admin user by username, compare password with bcryptjs.
// If match, sign JWT with username in payload, 24h expiry. Return token.
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'portfolio_jwt_secret_key_change_in_production',
      { expiresIn: '24h' }
    );

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Apply Auth Middleware to all routes below
// ==========================================
router.use(authMiddleware);

// ==========================================
// Profile Management
// ==========================================

// GET /profile - return full profile data (first row)
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

// PUT /profile - use profileUpload middleware from multerConfig.
// Update profile fields from req.body. If req.file exists, update profile_image to '/uploads/profile/' + req.file.filename.
router.put('/profile', profileUpload, (req, res) => {
  try {
    let profile = db.prepare('SELECT * FROM profile LIMIT 1').get();
    const allowedFields = [
      'name', 'title', 'subtitle', 'intro',
      'about_text', 'about_academic', 'about_interests', 'about_goals', 'about_areas',
      'github_url', 'linkedin_url', 'email', 'resume_path'
    ];

    if (!profile) {
      // Create initial profile if none exists
      const initialData = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          initialData[field] = req.body[field];
        }
      }
      if (req.file) {
        initialData.profile_image = '/uploads/profile/' + req.file.filename;
      }

      const keys = Object.keys(initialData);
      if (keys.length === 0) {
        return res.status(400).json({ error: 'No profile data provided' });
      }

      const columns = [...keys, 'updated_at'].join(', ');
      const placeholders = [...keys.map(() => '?'), "datetime('now')"].join(', ');
      const values = keys.map((k) => initialData[k]);

      db.prepare(`INSERT INTO profile (${columns}) VALUES (${placeholders})`).run(...values);
    } else {
      const updates = [];
      const params = [];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }

      if (req.file) {
        const newImagePath = '/uploads/profile/' + req.file.filename;
        updates.push('profile_image = ?');
        params.push(newImagePath);

        // Delete old profile image if it exists
        if (profile.profile_image) {
          deleteFile(profile.profile_image);
        }
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(profile.id);
        db.prepare(`UPDATE profile SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
    }

    const updatedProfile = db.prepare('SELECT * FROM profile LIMIT 1').get();
    res.json({ success: true, message: 'Profile updated successfully', profile: updatedProfile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /about - update about_text, about_academic, about_interests, about_goals, about_areas in profile table
router.put('/about', (req, res) => {
  try {
    const { about_text, about_academic, about_interests, about_goals, about_areas } = req.body;
    let profile = db.prepare('SELECT * FROM profile LIMIT 1').get();

    if (!profile) {
      db.prepare(`
        INSERT INTO profile (about_text, about_academic, about_interests, about_goals, about_areas, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(about_text || '', about_academic || '', about_interests || '', about_goals || '', about_areas || '');
    } else {
      const updates = [];
      const params = [];
      const aboutFields = { about_text, about_academic, about_interests, about_goals, about_areas };

      for (const [key, val] of Object.entries(aboutFields)) {
        if (val !== undefined) {
          updates.push(`${key} = ?`);
          params.push(val);
        }
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(profile.id);
        db.prepare(`UPDATE profile SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
    }

    const updatedProfile = db.prepare('SELECT * FROM profile LIMIT 1').get();
    res.json({ success: true, message: 'About section updated successfully', profile: updatedProfile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /social - update github_url, linkedin_url, email in profile table
router.put('/social', (req, res) => {
  try {
    const { github_url, linkedin_url, email } = req.body;
    let profile = db.prepare('SELECT * FROM profile LIMIT 1').get();

    if (!profile) {
      db.prepare(`
        INSERT INTO profile (github_url, linkedin_url, email, updated_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(github_url || '', linkedin_url || '', email || '');
    } else {
      const updates = [];
      const params = [];
      const socialFields = { github_url, linkedin_url, email };

      for (const [key, val] of Object.entries(socialFields)) {
        if (val !== undefined) {
          updates.push(`${key} = ?`);
          params.push(val);
        }
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(profile.id);
        db.prepare(`UPDATE profile SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
    }

    const updatedProfile = db.prepare('SELECT * FROM profile LIMIT 1').get();
    res.json({ success: true, message: 'Social links updated successfully', profile: updatedProfile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Skills CRUD
// ==========================================

// GET /skills - return all skills
router.get('/skills', (req, res) => {
  try {
    const skills = db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, id ASC').all();
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /skills/:id - return skill by id
router.get('/skills/:id', (req, res) => {
  try {
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /skills - insert new skill with name, category, icon, sort_order from req.body
router.post('/skills', (req, res) => {
  try {
    const { name, category, icon, sort_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO skills (name, category, icon, sort_order)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      name.trim(),
      category || 'General',
      icon || '',
      sort_order !== undefined ? Number(sort_order) : 0
    );

    const newSkill = db.prepare('SELECT * FROM skills WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newSkill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /skills/:id - update skill by id
router.put('/skills/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const { name, category, icon, sort_order } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(Number(sort_order));
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedSkill = db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
    res.json(updatedSkill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /skills/:id - delete skill by id
router.delete('/skills/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    db.prepare('DELETE FROM skills WHERE id = ?').run(id);
    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Projects CRUD
// ==========================================

// GET /projects - return all projects
router.get('/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, id ASC').all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /projects/:id - return project by id
router.get('/projects/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /projects - use projectUpload middleware. Insert project. If req.file, set image to '/uploads/projects/' + filename.
router.post('/projects', projectUpload, (req, res) => {
  try {
    const { title, description, technologies, features, github_url, demo_url, sort_order } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    const image = req.file ? '/uploads/projects/' + req.file.filename : (req.body.image || null);

    const stmt = db.prepare(`
      INSERT INTO projects (title, description, image, technologies, features, github_url, demo_url, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const result = stmt.run(
      title.trim(),
      description || '',
      image,
      technologies || '',
      features || '',
      github_url || '',
      demo_url || '',
      sort_order !== undefined ? Number(sort_order) : 0
    );

    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /projects/:id - use projectUpload. Update project. If new file, update image path.
router.put('/projects/:id', projectUpload, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { title, description, technologies, features, github_url, demo_url, sort_order } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (technologies !== undefined) {
      updates.push('technologies = ?');
      params.push(technologies);
    }
    if (features !== undefined) {
      updates.push('features = ?');
      params.push(features);
    }
    if (github_url !== undefined) {
      updates.push('github_url = ?');
      params.push(github_url);
    }
    if (demo_url !== undefined) {
      updates.push('demo_url = ?');
      params.push(demo_url);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(Number(sort_order));
    }

    if (req.file) {
      const newImagePath = '/uploads/projects/' + req.file.filename;
      updates.push('image = ?');
      params.push(newImagePath);

      // Clean up old image file
      if (existing.image) {
        deleteFile(existing.image);
      }
    } else if (req.body.image !== undefined) {
      updates.push('image = ?');
      params.push(req.body.image);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /projects/:id - get project first to find image path. Delete from db. Try to delete image file if it exists.
router.delete('/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    if (project.image) {
      deleteFile(project.image);
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Education CRUD
// ==========================================

// GET /education - return all entries
router.get('/education', (req, res) => {
  try {
    const education = db.prepare('SELECT * FROM education ORDER BY sort_order ASC, id ASC').all();
    res.json(education);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /education/:id - return entry by id
router.get('/education/:id', (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM education WHERE id = ?').get(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Education entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /education - insert new entry
router.post('/education', (req, res) => {
  try {
    const { college, degree, branch, university, academic_year, semester, achievements, sort_order } = req.body;
    if (!college || !degree) {
      return res.status(400).json({ error: 'College and degree are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO education (college, degree, branch, university, academic_year, semester, achievements, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      college,
      degree,
      branch || '',
      university || '',
      academic_year || '',
      semester || '',
      achievements || '',
      sort_order !== undefined ? Number(sort_order) : 0
    );

    const newEducation = db.prepare('SELECT * FROM education WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newEducation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /education/:id - update entry
router.put('/education/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM education WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Education entry not found' });
    }

    const allowed = ['college', 'degree', 'branch', 'university', 'academic_year', 'semester', 'achievements', 'sort_order'];
    const updates = [];
    const params = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(field === 'sort_order' ? Number(req.body[field]) : req.body[field]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE education SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedEducation = db.prepare('SELECT * FROM education WHERE id = ?').get(id);
    res.json(updatedEducation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /education/:id - delete entry
router.delete('/education/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM education WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Education entry not found' });
    }

    db.prepare('DELETE FROM education WHERE id = ?').run(id);
    res.json({ success: true, message: 'Education entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Certificates CRUD
// ==========================================

// GET /certificates - return all
router.get('/certificates', (req, res) => {
  try {
    const certificates = db.prepare('SELECT * FROM certificates ORDER BY sort_order ASC, id ASC').all();
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /certificates/:id - return certificate by id
router.get('/certificates/:id', (req, res) => {
  try {
    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    res.json(cert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /certificates - use certificateUpload. Insert cert. If file, set image path.
router.post('/certificates', certificateUpload, (req, res) => {
  try {
    const { title, organization, issue_date, description, cert_url, sort_order } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Certificate title is required' });
    }

    const image = req.file ? '/uploads/certificates/' + req.file.filename : (req.body.image || null);

    const stmt = db.prepare(`
      INSERT INTO certificates (title, organization, issue_date, description, image, cert_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      title.trim(),
      organization || '',
      issue_date || '',
      description || '',
      image,
      cert_url || '',
      sort_order !== undefined ? Number(sort_order) : 0
    );

    const newCert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /certificates/:id - use certificateUpload. Update. If new file, update image.
router.put('/certificates/:id', certificateUpload, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const { title, organization, issue_date, description, cert_url, sort_order } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (organization !== undefined) {
      updates.push('organization = ?');
      params.push(organization);
    }
    if (issue_date !== undefined) {
      updates.push('issue_date = ?');
      params.push(issue_date);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (cert_url !== undefined) {
      updates.push('cert_url = ?');
      params.push(cert_url);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(Number(sort_order));
    }

    if (req.file) {
      const newImagePath = '/uploads/certificates/' + req.file.filename;
      updates.push('image = ?');
      params.push(newImagePath);

      // Delete old certificate image/pdf
      if (existing.image) {
        deleteFile(existing.image);
      }
    } else if (req.body.image !== undefined) {
      updates.push('image = ?');
      params.push(req.body.image);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE certificates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedCert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    res.json(updatedCert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /certificates/:id - get cert, delete from db, try to delete image.
router.delete('/certificates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    db.prepare('DELETE FROM certificates WHERE id = ?').run(id);

    if (cert.image) {
      deleteFile(cert.image);
    }

    res.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Resume Management
// ==========================================

// POST /resume - use resumeUpload middleware. Update profile.resume_path to '/uploads/resume/' + filename.
router.post('/resume', resumeUpload, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const resumePath = '/uploads/resume/' + req.file.filename;
    let profile = db.prepare('SELECT * FROM profile LIMIT 1').get();

    if (!profile) {
      db.prepare(`
        INSERT INTO profile (resume_path, updated_at)
        VALUES (?, datetime('now'))
      `).run(resumePath);
    } else {
      if (profile.resume_path) {
        deleteFile(profile.resume_path);
      }

      db.prepare(`
        UPDATE profile 
        SET resume_path = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(resumePath, profile.id);
    }

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      resume_path: resumePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Contact Messages Management
// ==========================================

// GET /messages - return all from contact_messages ORDER BY created_at DESC
router.get('/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /messages/:id/read - update is_read = 1 for that id
router.put('/messages/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const message = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    db.prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?').run(id);
    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /messages/:id - delete message by id
router.delete('/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const message = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
