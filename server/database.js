const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'portfolio.db');

// sql.js wrapper that provides a better-sqlite3-compatible API
class Database {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async init() {
    const SQL = await initSqlJs();

    // Load existing database file or create new one
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.ready = true;
    this._initSchema();
    this._save();
    return this;
  }

  _save() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    }
  }

  _initSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        title TEXT,
        subtitle TEXT,
        intro TEXT,
        about_text TEXT,
        about_academic TEXT,
        about_interests TEXT,
        about_goals TEXT,
        about_areas TEXT,
        profile_image TEXT,
        github_url TEXT,
        linkedin_url TEXT,
        email TEXT,
        resume_path TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT,
        technologies TEXT,
        features TEXT,
        github_url TEXT,
        demo_url TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS education (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        college TEXT NOT NULL,
        degree TEXT NOT NULL,
        branch TEXT,
        university TEXT,
        academic_year TEXT,
        semester TEXT,
        achievements TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        organization TEXT NOT NULL,
        issue_date TEXT,
        description TEXT,
        image TEXT,
        cert_url TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // better-sqlite3 compatible API wrapper
  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self.db.run(sql, params);
        self._save();
        // Simulate better-sqlite3 run result
        const lastId = self.db.exec("SELECT last_insert_rowid() as id");
        const changes = self.db.exec("SELECT changes() as c");
        return {
          lastInsertRowid: lastId[0] ? lastId[0].values[0][0] : 0,
          changes: changes[0] ? changes[0].values[0][0] : 0
        };
      },
      get(...params) {
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self.db.run("BEGIN TRANSACTION");
      try {
        const result = fn(...args);
        self.db.run("COMMIT");
        self._save();
        return result;
      } catch (err) {
        self.db.run("ROLLBACK");
        throw err;
      }
    };
  }

  exec(sql) {
    this.db.run(sql);
    this._save();
  }

  close() {
    if (this.db) {
      this._save();
      this.db.close();
    }
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
module.exports.DB_PATH = DB_PATH;
