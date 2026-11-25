const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from ../.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Starting database seeding...');

  // Initialize database (only if not already initialized)
  const db = require('./database');
  if (!db.ready) {
    await db.init();
  }

  try {
    // 1. Admin user seeding
    const adminUsername = process.env.ADMIN_USERNAME || 'Aniruddha';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Aniruddha@2006';
    const saltRounds = 12;
    console.log(`[Seed] Using admin username: "${adminUsername}"`);

    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Check if admin exists
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(adminUsername);
    if (existing) {
      db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(passwordHash, adminUsername);
      console.log(`[Seed] Admin user "${adminUsername}" password updated.`);
    } else {
      db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(adminUsername, passwordHash);
      console.log(`[Seed] Admin user "${adminUsername}" created.`);
    }

    // 2. Profile data seeding (upsert)
    const profileExists = db.prepare('SELECT id FROM profile WHERE id = 1').get();
    if (!profileExists) {
      db.prepare(`
        INSERT INTO profile (id, name, title, subtitle, intro, about_text, about_academic, about_interests, about_goals, about_areas, profile_image, github_url, linkedin_url, email, resume_path)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', '', '')
      `).run(
        '[Your Name]',
        'Computer Science Student',
        'Aspiring Software Developer',
        'Passionate about building innovative solutions with technology.',
        'I am a passionate Computer Science student dedicated to developing scalable, efficient, and user-centric software solutions. With a strong theoretical foundation and a drive for practical execution, I enjoy tackling complex problems and crafting elegant web applications.',
        'Currently pursuing an undergraduate degree in Computer Science and Engineering, focusing on Core Algorithms, Data Structures, Database Systems, Computer Networks, and Full-Stack Engineering.',
        'Keenly interested in full-stack web development, intelligent systems, cloud services, and IoT device integration.',
        'Aspiring to contribute to high-impact software projects, collaborate with exceptional engineering teams, and continuously evolve as a versatile software engineer.',
        'Full-Stack Development, Cloud Computing, System Design, REST APIs, Database Optimization'
      );
      console.log('[Seed] Default profile data seeded successfully.');
    } else {
      console.log('[Seed] Profile data already exists, skipping.');
    }

    // 3. Skills seeding (if skills table is empty)
    const skillsCount = db.prepare('SELECT COUNT(*) as count FROM skills').get();
    if (skillsCount.count === 0) {
      const defaultSkills = [
        { name: 'C', category: 'Programming Languages', icon: 'fas fa-copyright', sort_order: 1 },
        { name: 'C++', category: 'Programming Languages', icon: 'fas fa-code', sort_order: 2 },
        { name: 'Python', category: 'Programming Languages', icon: 'fab fa-python', sort_order: 3 },
        { name: 'JavaScript', category: 'Programming Languages', icon: 'fab fa-js', sort_order: 4 },
        { name: 'HTML', category: 'Web Development', icon: 'fab fa-html5', sort_order: 1 },
        { name: 'CSS', category: 'Web Development', icon: 'fab fa-css3-alt', sort_order: 2 },
        { name: 'JavaScript', category: 'Web Development', icon: 'fab fa-js', sort_order: 3 },
        { name: 'Git', category: 'Tools & Technologies', icon: 'fab fa-git-alt', sort_order: 1 },
        { name: 'GitHub', category: 'Tools & Technologies', icon: 'fab fa-github', sort_order: 2 },
        { name: 'VS Code', category: 'Tools & Technologies', icon: 'fas fa-laptop-code', sort_order: 3 },
        { name: 'Arduino IDE', category: 'Tools & Technologies', icon: 'fas fa-microchip', sort_order: 4 }
      ];

      for (const skill of defaultSkills) {
        db.prepare('INSERT INTO skills (name, category, icon, sort_order) VALUES (?, ?, ?, ?)').run(
          skill.name, skill.category, skill.icon, skill.sort_order
        );
      }
      console.log(`[Seed] Seeded ${defaultSkills.length} default skills.`);
    } else {
      console.log('[Seed] Skills table already contains data, skipping seed.');
    }

    // 4. Projects seeding (if projects table is empty)
    const projectsCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
    if (projectsCount.count === 0) {
      const defaultProjects = [
        {
          title: 'SmartCity 360',
          description: 'A smart city management platform designed to address urban problems using intelligent infrastructure and technology. Features real-time sensor monitoring, interactive geospatial maps, automated alerts, and predictive resource planning.',
          technologies: 'IoT, Web Technologies, Cloud Computing, Data Analytics',
          features: 'Smart city solutions, Intelligent infrastructure monitoring, Urban problem management, Real-time data visualization',
          sort_order: 1
        },
        {
          title: 'SaveIQ AI Studio',
          description: 'An AI-powered personal finance and savings management platform that helps users manage savings goals, monitor progress, improve financial habits, and receive intelligent recommendations.',
          technologies: 'Google Apps Script, Google Sheets, Groq API, LLaMA, HTML, CSS, JavaScript',
          features: 'AI-driven financial analysis, Savings goal tracking, Budget recommendations, Financial health dashboard',
          sort_order: 2
        },
        {
          title: 'Medicine Reminder and Adherence System',
          description: 'An IoT-based medicine reminder and health monitoring system using ESP32 and connected sensors. Provides customized dosage reminders, adherence tracking, and notification alerts.',
          technologies: 'ESP32, IoT, HTML, CSS, JavaScript, Sensors',
          features: 'Custom recurring dosage schedules, Medication adherence logs, Push notifications, Caregiver alerts',
          sort_order: 3
        }
      ];

      for (const proj of defaultProjects) {
        db.prepare(
          'INSERT INTO projects (title, description, image, technologies, features, github_url, demo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(proj.title, proj.description, '', proj.technologies, proj.features, '', '', proj.sort_order);
      }
      console.log(`[Seed] Seeded ${defaultProjects.length} default projects.`);
    } else {
      console.log('[Seed] Projects table already contains data, skipping seed.');
    }

    // 5. Education seeding (if education table is empty)
    const educationCount = db.prepare('SELECT COUNT(*) as count FROM education').get();
    if (educationCount.count === 0) {
      db.prepare(
        'INSERT INTO education (college, degree, branch, university, academic_year, semester, achievements, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        'Department of Computer Science & Engineering',
        'Bachelor of Technology / Bachelor of Engineering',
        'Computer Science and Engineering',
        'State Technological University',
        '2022 - 2026',
        '6th Semester',
        'Maintained excellent academic standing; Active participant in technical symposiums and hackathons; Developed multiple full-stack academic projects.',
        1
      );
      console.log('[Seed] Default education entry seeded successfully.');
    } else {
      console.log('[Seed] Education table already contains data, skipping seed.');
    }

    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
