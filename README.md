# Personal Portfolio Website

A modern, high-performance personal developer portfolio website paired with a comprehensive Content Management System (CMS) admin dashboard. Designed for software engineers, computer science students, and tech professionals to showcase their work, credentials, and achievements with effortless content updates.

---

## Overview

Modern, professional personal developer portfolio website with a full admin dashboard (CMS). Built with Node.js, Express, SQLite, and vanilla HTML/CSS/JS.

The project features a dual-interface architecture:
1. **Public Portfolio** (`/`): A clean, visually polished, single-page portfolio highlighting your bio, tech stack, featured projects, academic history, certifications, downloadable resume, and a live contact form.
2. **Admin CMS Dashboard** (`/admin.html`): A password-protected management control room allowing you to edit every piece of website data, manage media uploads, and view visitor contact submissions in real time without touching source code.

Zero heavy frontend frameworks, instant page loads, and fully self-contained using an embedded SQLite database.

---

## Features

- 🌙 **Dark & Light Theme**: Deep dark theme by default with smooth light mode toggle, persisting user preference across sessions via `localStorage`.
- 📱 **Fully Responsive Layout**: Mobile-first design crafted with CSS Flexbox and Grid, scaling seamlessly across mobile phones, tablets, laptops, and ultra-wide displays.
- 🛠️ **Full Admin Dashboard (CMS)**: Comprehensive CRUD interface to update your profile, bio sections, technical skills, projects, education, certificates, and social links.
- 💾 **Embedded SQLite Database**: Lightweight, zero-configuration database powered by `sql.js` (pure JavaScript SQLite via WebAssembly) — no native compilation required, works on any platform.
- 📁 **File Upload Management**: Built-in support for uploading profile pictures, project screenshots, certificate images/PDFs, and resume PDFs via Multer with strict validation.
- 🔒 **Secure Authentication**: Admin dashboard protected by JSON Web Tokens (JWT) and industry-standard `bcryptjs` password hashing (12 salt rounds).
- 🔍 **SEO-Friendly Architecture**: Semantic HTML5 markup, structured metadata, OpenGraph tags, and ultra-fast static asset delivery.
- ♿ **Accessible & Standards-Compliant**: High-contrast ratios, keyboard navigational support, semantic tags, and descriptive ARIA attributes.
- 📬 **Interactive Contact Portal**: Visitors can send messages directly through the portfolio; submissions are captured in the database with unread badges in the admin panel.
- ⚡ **Zero Frontend Framework Overhead**: Built with pure HTML5, modern CSS3 variables, and vanilla JavaScript (ES6+) for maximum performance and minimal bloat.

---

## Tech Stack

- **Backend**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database**: [SQLite](https://www.sqlite.org/) via [`sql.js`](https://github.com/sql-js/sql.js) (pure JavaScript SQLite compiled to WebAssembly — no native compilation needed)
- **Authentication**: [JSON Web Tokens (jsonwebtoken)](https://github.com/auth0/node-jsonwebtoken) & [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js)
- **File Uploads**: [`multer`](https://github.com/expressjs/multer) & [`uuid`](https://github.com/uuidjs/uuid)
- **Security & Utilities**: [`helmet`](https://helmetjs.github.io/), [`cors`](https://github.com/expressjs/cors), [`dotenv`](https://github.com/motdotla/dotenv)
- **Frontend**: Vanilla HTML5, Modern CSS3 (Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+ Fetch API)
- **Icons**: [Font Awesome 6](https://fontawesome.com/)
- **Fonts**: [Google Fonts](https://fonts.google.com/) (Inter, Outfit, Fira Code)

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or later recommended)
- [npm](https://www.npmjs.com/) (v9.x or later)
- [Git](https://git-scm.com/)

### Installation Steps

1. **Clone the repository and navigate into the project directory:**
   ```bash
   git clone <your-repository-url>
   cd "Portfolio Web"
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment configuration to create your `.env` file:
   ```bash
   # On Windows PowerShell / Command Prompt
   copy .env.example .env

   # On Linux / macOS
   cp .env.example .env
   ```
   Open `.env` in your code editor and update the default values (especially `JWT_SECRET` and `ADMIN_PASSWORD`).

4. **Initialize and seed the SQLite database:**
   ```bash
   npm run setup
   ```
   This command executes `server/seed.js`, creating the database schema (`server/portfolio.db`), inserting sample data, and generating the hashed admin credentials.

5. **Start the application:**
   ```bash
   npm start
   ```
   For development with active restarts, you can run:
   ```bash
   npm run dev
   ```

### Access URLs
- **Public Portfolio**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `changeme123` (or the password configured in your `.env`)

> [!WARNING]
> **Change Default Credentials**: Always update `ADMIN_PASSWORD` and `JWT_SECRET` in your `.env` file and re-run `npm run setup` before hosting or exposing this application to the public internet.

---

## Project Structure

```
Portfolio Web/
│
├── .env                         # Local environment configuration (git-ignored)
├── .env.example                 # Template for environment variables
├── .gitignore                   # Git ignore rules for node_modules, DB, and uploads
├── package.json                 # Project dependencies, metadata, and scripts
├── README.md                    # Project documentation and guide
│
├── public/                      # Static client-facing files
│   ├── index.html               # Main portfolio landing page
│   ├── admin.html               # Admin CMS dashboard single-page interface
│   ├── css/
│   │   ├── style.css            # Stylesheet for public portfolio (theme, layout, animations)
│   │   └── admin.css            # Stylesheet for admin CMS (sidebar, tables, modal, forms)
│   ├── js/
│   │   ├── app.js               # Public frontend controller (data fetch, theme, contact form)
│   │   └── admin.js             # Admin dashboard controller (auth, tab switching, CRUD actions)
│   └── uploads/                 # Uploaded media assets (git-ignored except .gitkeep)
│       ├── certificates/        # Certificate images and PDF credentials
│       ├── profile/             # Profile avatar images
│       ├── projects/            # Project showcase cover screenshots
│       └── resume/              # Uploaded curriculum vitae (PDF)
│
└── server/                      # Node.js / Express backend
    ├── index.js                 # Server entry point, middleware setup, route mounting
    ├── database.js              # SQLite connection, schema definition, and helper queries
    ├── seed.js                  # Database seeder (admin user & demo portfolio content)
    ├── portfolio.db             # SQLite database file (generated on setup, git-ignored)
    ├── middleware/
    │   └── auth.js              # JWT verification middleware protecting admin API routes
    └── routes/
        ├── api.js               # Public REST endpoints (/profile, /skills, /projects, etc.)
        ├── admin.js             # Protected CRUD endpoints (/api/admin/*)
        └── multerConfig.js      # Disk storage configuration, file filters, and size limits
```

---

## Content Management Guide

The Admin Dashboard (`/admin.html`) gives you complete control over every content block on your portfolio website. Log in with your admin credentials to access the following sections:

### 1. Profile
- **Fields**: Full Name, Professional Title, Subtitle, Intro Hook, Email, GitHub Profile URL, LinkedIn URL.
- **Avatar Upload**: Upload your profile picture (`.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`, max 5MB).
- **Actions**: Click **Save Changes** to immediately update your public hero and footer information.

### 2. About Me
- **Detailed Narrative**: Update your personal summary, academic background, technical focus areas, career objectives, and interests.
- **Real-time Sync**: The public "About" section renders paragraphs dynamically with formatted highlight tags.

### 3. Skills
- **Organization**: Group skills into distinct categories (e.g., *Frontend*, *Backend*, *Programming Languages*, *Database*, *DevOps & Cloud*, *Tools*).
- **Custom Icons**: Specify Font Awesome icon class names (e.g., `fa-brands fa-react`, `fa-brands fa-node-js`, `fa-solid fa-database`).
- **Ordering**: Set the `sort_order` number to control the display sequence on your public page.

### 4. Projects
- **Showcase Items**: Add, edit, and delete featured projects.
- **Fields**: Project Title, Summary Description, Technologies Used (comma-separated tags), Key Highlights / Features, GitHub Repository Link, Live Demo URL.
- **Media Upload**: Upload dedicated project screenshot cards (max 5MB).

### 5. Education
- **Academic Milestones**: Record your academic credentials.
- **Fields**: Degree Name (e.g., B.Tech in Computer Science), College / Institution, University Board, Academic Year / Duration, Current Semester / GPA, and Key Achievements.

### 6. Certificates
- **Credentials & Badges**: Add certifications from AWS, Coursera, freeCodeCamp, Google, etc.
- **Fields**: Certificate Title, Issuing Organization, Issue Date, Credential Verification URL, and Short Description.
- **Document / Image Upload**: Attach a copy of the certificate as a PNG, JPG, or PDF (max 10MB).

### 7. Resume
- **PDF Upload**: Upload your official resume document (`.pdf` only, max 10MB).
- **Public Integration**: When visitors click **Download Resume** on the public portfolio, the server securely serves the uploaded file via `/api/resume/download`.

### 8. Social Links
- Update your GitHub, LinkedIn, and primary contact email in the **Profile** section. These automatically update all navigation header buttons, social cards, and footer links across the site.

### 9. Messages
- **Inbox Management**: View incoming inquiries submitted through the public contact form.
- **Details**: Displays sender name, email address, subject line, date submitted, and full message body.
- **Status & Cleanup**: Toggle messages between read and unread, or permanently delete processed submissions.

---

## Changing Admin Password

To change your admin credentials:

1. Open your `.env` file in the project root:
   ```env
   ADMIN_USERNAME=your_new_username
   ADMIN_PASSWORD=YourNewStrongPassword123!
   ```
2. Re-run the database seeding tool to hash the new password and update the database:
   ```bash
   npm run setup
   ```
3. Restart your server:
   ```bash
   npm start
   ```
4. Navigate to `/admin.html` and sign in with your updated username and password.

---

## Deployment Guide

### Option 1: Railway (Recommended)

1. **Create an Account**: Sign up at [Railway.app](https://railway.app/).
2. **New Project**: Select **New Project** > **Deploy from GitHub repo** and choose your repository.
3. **Configure Environment Variables**:
   In the Railway dashboard under **Variables**, add:
   - `PORT`: `3000` (or Railway's `$PORT`)
   - `JWT_SECRET`: A long, randomly generated secret string
   - `ADMIN_USERNAME`: Your desired admin username
   - `ADMIN_PASSWORD`: Your secure admin password
4. **Persistent Storage (Crucial for SQLite & Uploads)**:
   - Go to your Railway service **Settings** > **Volumes**.
   - Mount a persistent volume at `/app/server` (to persist `portfolio.db`) and `/app/public/uploads` (to persist uploaded images and PDFs).
5. **Initial Setup Command**:
   Open Railway's service terminal and run:
   ```bash
   npm run setup
   ```
6. **Deploy**: Railway builds and launches the application with `npm start`.

---

### Option 2: Render

1. **Sign Up**: Create an account at [Render.com](https://render.com/).
2. **New Web Service**: Click **New +** > **Web Service** and connect your GitHub repository.
3. **Build & Start Commands**:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run setup`
   - **Start Command**: `npm start`
4. **Environment Variables**:
   Under the **Environment** tab, set:
   - `PORT`: `3000`
   - `JWT_SECRET`: Random 64-character secret
   - `ADMIN_USERNAME`: Your production admin username
   - `ADMIN_PASSWORD`: Your production admin password
5. **Persistent Disks**:
   - Render free tier ephemeral instances wipe file storage on restart. For persistent SQLite data on Render, attach a **Persistent Disk** mounted to store `server/portfolio.db` and `public/uploads`.

---

### Option 3: VPS (Ubuntu / Debian) with PM2 & Nginx

For full control over performance and data, deploy to a Linux VPS (DigitalOcean, Linode, AWS EC2, or Hetzner).

#### 1. Server Setup & Node.js Installation
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx build-essential
```

#### 2. Clone Repository & Install
```bash
cd /var/www
sudo git clone <your-repository-url> portfolio
cd portfolio

# Install dependencies and PM2 globally
sudo npm install
sudo npm install -g pm2

# Setup environment
sudo cp .env.example .env
sudo nano .env # Edit with your production values

# Initialize database
sudo npm run setup
```

#### 3. Start with PM2 Process Manager
```bash
pm2 start server/index.js --name "portfolio-web"
pm2 save
pm2 startup
```

#### 4. Configure Nginx Reverse Proxy
Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/portfolio
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 15M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/portfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Secure with Free SSL (Let's Encrypt / Certbot)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Environment Variables

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :--- |
| `PORT` | Network port on which the Express server listens | `3000` | Optional |
| `JWT_SECRET` | Cryptographic secret key used to sign and verify admin authentication JWT tokens | `your-super-secret-key-change-this` | **Required** |
| `ADMIN_USERNAME` | Username for admin authentication (used when executing `npm run setup`) | `admin` | **Required** |
| `ADMIN_PASSWORD` | Plaintext password used by `npm run setup` to generate the initial admin password hash | `changeme123` | **Required** |

---

## GitHub Integration

Follow these steps to initialize Git and push the project to GitHub:

1. **Initialize Git repository**:
   ```bash
   git init
   ```

2. **Verify `.gitignore`**:
   Ensure `.env`, `node_modules/`, `server/portfolio.db`, and upload directories are ignored so confidential credentials and user uploads are never committed.

3. **Stage all files**:
   ```bash
   git add .
   ```

4. **Create the initial commit**:
   ```bash
   git commit -m "feat: initial commit for personal portfolio website with admin CMS"
   ```

5. **Link your GitHub remote repository**:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   ```

6. **Rename branch to `main` and push**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

---

## Security Notes

- **Password Hashing**: Passwords are never stored in plain text. Passwords undergo irreversible hashing via `bcryptjs` with an industry-recommended cost factor of 12 rounds.
- **JWT Authentication**: Protected API endpoints (`/api/admin/*`) require an `Authorization: Bearer <token>` header containing a valid signed JWT. Tokens expire automatically after 24 hours.
- **SQL Injection Prevention**: All database queries are executed using parameterized prepared statements via `sql.js`, completely mitigating SQL injection attack vectors.
- **Input Validation & Sanitization**: Strict file type validation restricts uploads to safe extensions (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.pdf`), rejecting executable or script formats.
- **File Size Restrictions**: Upload limits are strictly enforced at the HTTP boundary via Multer (5MB for images, 10MB for documents).
- **HTTP Security Headers**: Express responses are hardened using `helmet` to help prevent Cross-Site Scripting (XSS), MIME-type sniffing, and clickjacking attacks.

---

## Future Expansion

- 📝 **Integrated Blog Platform**: Markdown-supported blogging engine with syntax highlighting, search, and categorization.
- 💼 **Work & Internship Experience Timeline**: Dedicated timeline component showcasing employment history, responsibilities, and achievements.
- 💬 **Client & Peer Testimonials**: Section for endorsements, colleague recommendations, and client feedback.
- 🏆 **Hackathons & Competitions**: Showcase of hackathon participation, winning solutions, and pitch decks.
- 🎖️ **Awards & Honors**: Dedicated highlight reel for academic distinctions and professional honors.
- 🌐 **Internationalization (i18n)**: Multi-language switch for viewers across different geographic regions.

---

## License

This project is open-source software licensed under the [MIT License](https://opensource.org/licenses/MIT). You are free to customize, adapt, and deploy it for your personal or commercial portfolio.
