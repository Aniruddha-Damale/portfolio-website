/**
 * Admin Dashboard Client-Side Application
 * Vanilla JavaScript (ES6+)
 * 
 * Functionality:
 * 1. API Helper Function (adminFetch with JWT auth, auto headers & 401 handling)
 * 2. Auth & Page Management (Login, Logout, Session check)
 * 3. Sidebar Navigation & Mobile Sidebar Toggle
 * 4. Dashboard Data Orchestration (Parallel fetching, Stat cards)
 * 5. Profile Management (Live image preview, multipart upload)
 * 6. About Section Management
 * 7. Skills Management (CRUD with interactive modal)
 * 8. Projects Management (CRUD with file upload & features parsing)
 * 9. Education Management (CRUD with modal forms)
 * 10. Certificates Management (CRUD with multipart image/PDF uploads)
 * 11. Resume Management (File upload & embedded preview)
 * 12. Messages Management (Accordion view, mark read, unread count badge, deletion)
 * 13. Social Links Management
 * 14. Reusable Modal System (Dynamic body & save callbacks)
 * 15. Async Confirm Dialog System
 * 16. Toast Notification System
 * 17. Initialization & Event Delegation
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =========================================================================
  // STATE & CACHED DATA
  // =========================================================================
  let cachedSkills = [];
  let cachedProjects = [];
  let cachedEducation = [];
  let cachedCertificates = [];
  let cachedMessages = [];

  // Modal & Confirm dialog callbacks
  let currentModalSaveCallback = null;
  let confirmDialogResolver = null;

  // DOM Elements: Core Containers
  const loginPage = document.getElementById('login-page');
  const dashboard = document.getElementById('dashboard');
  const sidebar = document.getElementById('sidebar');

  // =========================================================================
  // UTILITY / SANITIZATION HELPERS
  // =========================================================================

  /**
   * Escape HTML to prevent XSS injection
   * @param {string} str
   * @returns {string}
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Truncate text to a maximum length with ellipsis
   * @param {string} text
   * @param {number} maxLen
   * @returns {string}
   */
  function truncateText(text, maxLen = 80) {
    if (!text) return '';
    if (text.length > maxLen) {
      return text.slice(0, maxLen) + '...';
    }
    return text;
  }

  /**
   * Format date string nicely for admin lists
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Update text content of an element by ID safely if it exists
   * @param {string} id
   * @param {string|number} count
   */
  function updateCount(id, count) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = count;
    }
  }

  // =========================================================================
  // 1. API HELPER FUNCTION
  // =========================================================================

  /**
   * Enhanced fetch wrapper for Admin API requests
   * - Injects Authorization Bearer token from localStorage
   * - Adds Content-Type: application/json if body is not FormData
   * - Serializes plain objects to JSON strings
   * - Redirects to login and throws if response status is 401
   * 
   * @param {string} url
   * @param {RequestInit} options
   * @returns {Promise<Response>}
   */
  async function adminFetch(url, options = {}) {
    const token = localStorage.getItem('admin_token');
    const headers = Object.assign({}, options.headers || {});

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body = options.body;

    // Check if body is FormData
    const isFormData = body instanceof FormData;

    // If body is NOT FormData, ensure Content-Type is application/json
    if (!isFormData) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      // If body is a plain object, automatically serialize to JSON
      if (body && typeof body === 'object' && !(body instanceof Blob)) {
        body = JSON.stringify(body);
      }
    }

    const mergedOptions = {
      ...options,
      headers,
      body
    };

    const response = await fetch(url, mergedOptions);

    // If unauthorized, clear invalid session and prompt login
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      showLoginPage();
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  }

  // =========================================================================
  // 2. AUTH / PAGE MANAGEMENT
  // =========================================================================

  /**
   * Display login view and hide main admin dashboard
   */
  function showLoginPage() {
    if (loginPage) loginPage.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
  }

  /**
   * Display dashboard view and trigger full data load
   */
  function showDashboard() {
    if (loginPage) loginPage.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');
    loadDashboardData();
  }

  /**
   * Check authentication state on page load
   */
  async function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      showLoginPage();
      return;
    }

    try {
      const res = await adminFetch('/api/admin/profile');
      if (res.ok) {
        showDashboard();
      } else {
        showLoginPage();
      }
    } catch (err) {
      console.warn('Authentication check failed:', err.message);
      showLoginPage();
    }
  }

  /**
   * Set up login form submission handler
   */
  function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const loginError = document.getElementById('login-error');
      if (loginError) {
        loginError.textContent = '';
        loginError.classList.add('hidden');
      }

      const usernameInput =
        document.getElementById('login-username') ||
        loginForm.querySelector('[name="username"]');

      const passwordInput =
        document.getElementById('login-password') ||
        loginForm.querySelector('[name="password"]');

      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!username || !password) {
        if (loginError) {
          loginError.textContent = 'Please enter both username and password.';
          loginError.classList.remove('hidden');
        }
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Login';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        }

        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid username or password');
        }

        if (data.token) {
          localStorage.setItem('admin_token', data.token);
          loginForm.reset();
          showDashboard();
          showAdminToast('Welcome back! Login successful.', 'success');
        } else {
          throw new Error('Authentication token not received.');
        }
      } catch (err) {
        console.error('Login error:', err);
        if (loginError) {
          loginError.textContent = err.message || 'Invalid username or password';
          loginError.classList.remove('hidden');
        }
        showAdminToast(err.message || 'Login failed', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  /**
   * Set up logout button handler
   */
  function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('admin_token');
      showLoginPage();
      showAdminToast('You have been logged out successfully.', 'info');
    });
  }

  // =========================================================================
  // 3. SIDEBAR NAVIGATION
  // =========================================================================

  /**
   * Set up sidebar panel switching and mobile navigation drawer toggle
   */
  function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const panels = document.querySelectorAll('.dashboard-panel');

    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const panelTarget = item.getAttribute('data-panel');
        if (!panelTarget) return;

        e.preventDefault();

        // 1. Remove active state from all nav items and highlight clicked
        navItems.forEach((n) => n.classList.remove('active'));
        item.classList.add('active');

        // 2. Hide all panels
        panels.forEach((p) => p.classList.add('hidden'));

        // 3. Show target panel matching ID or data-panel
        const targetPanel =
          document.getElementById(panelTarget) ||
          document.getElementById(`panel-${panelTarget}`) ||
          document.querySelector(`.panel[data-panel="${panelTarget}"]`);

        if (targetPanel) {
          targetPanel.classList.remove('hidden');
        }

        // 4. On mobile viewport, automatically collapse sidebar
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    });

    // Mobile sidebar toggle button
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Close sidebar on click outside on mobile
    document.addEventListener('click', (e) => {
      if (
        sidebar &&
        sidebar.classList.contains('open') &&
        sidebarToggle &&
        !sidebar.contains(e.target) &&
        !sidebarToggle.contains(e.target)
      ) {
        sidebar.classList.remove('open');
      }
    });
  }

  // =========================================================================
  // 4. LOAD DASHBOARD DATA
  // =========================================================================

  /**
   * Fetch all portfolio resources in parallel, update stat cards, and populate panels
   */
  async function loadDashboardData() {
    try {
      const [
        profileRes,
        skillsRes,
        projectsRes,
        educationRes,
        certificatesRes,
        messagesRes
      ] = await Promise.allSettled([
        adminFetch('/api/admin/profile'),
        adminFetch('/api/admin/skills'),
        adminFetch('/api/admin/projects'),
        adminFetch('/api/admin/education'),
        adminFetch('/api/admin/certificates'),
        adminFetch('/api/admin/messages')
      ]);

      // Stat card updates: Skills
      if (skillsRes.status === 'fulfilled' && skillsRes.value.ok) {
        cachedSkills = await skillsRes.value.json();
        updateCount('stat-skills', cachedSkills.length);
      }

      // Stat card updates: Projects
      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        cachedProjects = await projectsRes.value.json();
        updateCount('stat-projects', cachedProjects.length);
      }

      // Stat card updates: Education
      if (educationRes.status === 'fulfilled' && educationRes.value.ok) {
        cachedEducation = await educationRes.value.json();
      }

      // Stat card updates: Certificates
      if (certificatesRes.status === 'fulfilled' && certificatesRes.value.ok) {
        cachedCertificates = await certificatesRes.value.json();
        updateCount('stat-certificates', cachedCertificates.length);
      }

      // Stat card updates: Messages
      if (messagesRes.status === 'fulfilled' && messagesRes.value.ok) {
        cachedMessages = await messagesRes.value.json();
        const unreadCount = cachedMessages.filter((m) => !m.is_read).length;
        updateCount('stat-messages', cachedMessages.length);
        updateMessageBadge(unreadCount);
      }

      // Render individual panel views
      await Promise.allSettled([
        loadProfile(),
        loadAbout(),
        loadSkills(),
        loadProjects(),
        loadEducation(),
        loadCertificates(),
        loadResume(),
        loadMessages(),
        loadSocial()
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      showAdminToast('Failed to load some dashboard sections.', 'error');
    }
  }

  // =========================================================================
  // 5. PROFILE PANEL
  // =========================================================================

  /**
   * Fetch profile data and fill profile form fields
   */
  async function loadProfile() {
    try {
      const res = await adminFetch('/api/admin/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      const profile = await res.json();

      const nameInput = document.getElementById('profile-name');
      const titleInput = document.getElementById('profile-title');
      const subtitleInput = document.getElementById('profile-subtitle');
      const introInput = document.getElementById('profile-intro');
      const previewImg = document.getElementById('profile-image-preview');

      if (nameInput) nameInput.value = profile.name || '';
      if (titleInput) titleInput.value = profile.title || '';
      if (subtitleInput) subtitleInput.value = profile.subtitle || '';
      if (introInput) introInput.value = profile.intro || '';

      if (previewImg && profile.profile_image) {
        previewImg.src = profile.profile_image + '?t=' + Date.now();
        previewImg.classList.remove('hidden');
        previewImg.style.display = 'block';
      }
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  }

  /**
   * Handle image file selection with FileReader for instant visual feedback
   */
  function setupProfileImagePreview() {
    const fileInput = document.getElementById('profile-image-input');
    const previewImg = document.getElementById('profile-image-preview');

    if (!fileInput || !previewImg) return;

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          showAdminToast('Please select a valid image file (PNG, JPG, WebP, SVG)', 'error');
          fileInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewImg.classList.remove('hidden');
          previewImg.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  /**
   * Set up Profile Form submission (multipart/form-data)
   */
  function setupProfileForm() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Save Profile';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Profile...';
        }

        const formData = new FormData();
        const nameVal = document.getElementById('profile-name')?.value || '';
        const titleVal = document.getElementById('profile-title')?.value || '';
        const subtitleVal = document.getElementById('profile-subtitle')?.value || '';
        const introVal = document.getElementById('profile-intro')?.value || '';

        formData.append('name', nameVal);
        formData.append('title', titleVal);
        formData.append('subtitle', subtitleVal);
        formData.append('intro', introVal);

        const fileInput = document.getElementById('profile-image-input');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          formData.append('profile_image', fileInput.files[0]);
        }

        const res = await adminFetch('/api/admin/profile', {
          method: 'PUT',
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update profile');

        showAdminToast('Profile details updated successfully!', 'success');

        if (data.profile && data.profile.profile_image) {
          const previewImg = document.getElementById('profile-image-preview');
          if (previewImg) {
            previewImg.src = data.profile.profile_image + '?t=' + Date.now();
            previewImg.classList.remove('hidden');
          }
        }
      } catch (err) {
        console.error('Profile update error:', err);
        showAdminToast(err.message || 'Failed to update profile', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  }

  // =========================================================================
  // 6. ABOUT PANEL
  // =========================================================================

  /**
   * Fetch profile data and fill about section textareas
   */
  async function loadAbout() {
    try {
      const res = await adminFetch('/api/admin/profile');
      if (!res.ok) throw new Error('Failed to load about section');
      const profile = await res.json();

      const aboutText = document.getElementById('about-text');
      const aboutAcademic = document.getElementById('about-academic');
      const aboutInterests = document.getElementById('about-interests');
      const aboutGoals = document.getElementById('about-goals');
      const aboutAreas = document.getElementById('about-areas');

      if (aboutText) aboutText.value = profile.about_text || '';
      if (aboutAcademic) aboutAcademic.value = profile.about_academic || '';
      if (aboutInterests) aboutInterests.value = profile.about_interests || '';
      if (aboutGoals) aboutGoals.value = profile.about_goals || '';
      if (aboutAreas) aboutAreas.value = profile.about_areas || '';
    } catch (err) {
      console.error('loadAbout error:', err);
    }
  }

  /**
   * Set up About Form submission (JSON body)
   */
  function setupAboutForm() {
    const aboutForm = document.getElementById('about-form');
    if (!aboutForm) return;

    aboutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = aboutForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Save About';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving About...';
        }

        const payload = {
          about_text: document.getElementById('about-text')?.value || '',
          about_academic: document.getElementById('about-academic')?.value || '',
          about_interests: document.getElementById('about-interests')?.value || '',
          about_goals: document.getElementById('about-goals')?.value || '',
          about_areas: document.getElementById('about-areas')?.value || ''
        };

        const res = await adminFetch('/api/admin/about', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update about section');

        showAdminToast('About section updated successfully!', 'success');
      } catch (err) {
        console.error('About update error:', err);
        showAdminToast(err.message || 'Failed to update about section', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  }

  // =========================================================================
  // 7. SKILLS PANEL
  // =========================================================================

  /**
   * Fetch and render skills list
   */
  async function loadSkills() {
    const skillsList = document.getElementById('skills-list');
    if (!skillsList) return;

    try {
      const res = await adminFetch('/api/admin/skills');
      if (!res.ok) throw new Error('Failed to load skills');
      cachedSkills = await res.json();

      updateCount('stat-skills', cachedSkills.length);
      updateCount('total-skills', cachedSkills.length);

      if (cachedSkills.length === 0) {
        skillsList.innerHTML = `
          <div class="empty-state p-4 text-center text-muted">
            <i class="fas fa-code fa-2x mb-2"></i>
            <p>No skills added yet. Click "Add Skill" above to get started.</p>
          </div>
        `;
        return;
      }

      skillsList.innerHTML = cachedSkills
        .map((skill) => {
          const iconClass = skill.icon || 'fas fa-code';
          return `
            <div class="admin-item-row skill-item" data-id="${skill.id}">
              <div class="item-main-info d-flex align-items-center gap-3">
                <span class="skill-icon-badge"><i class="${escapeHTML(iconClass)}"></i></span>
                <div class="skill-meta">
                  <span class="item-title font-semibold">${escapeHTML(skill.name)}</span>
                  <span class="badge badge-category">${escapeHTML(skill.category)}</span>
                  ${skill.sort_order ? `<span class="badge badge-subtle">Order: ${skill.sort_order}</span>` : ''}
                </div>
              </div>
              <div class="item-actions d-flex gap-2">
                <button type="button" class="btn btn-sm btn-edit edit-skill-btn" data-id="${skill.id}" title="Edit skill">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="btn btn-sm btn-danger delete-skill-btn" data-id="${skill.id}" title="Delete skill">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      console.error('loadSkills error:', err);
      showAdminToast(err.message || 'Error loading skills', 'error');
    }
  }

  /**
   * Set up Skills panel action handlers (Add, Edit, Delete via delegation)
   */
  function setupSkillsActions() {
    const addSkillBtn = document.getElementById('add-skill-btn');
    if (addSkillBtn) {
      addSkillBtn.addEventListener('click', () => {
        openModal(
          'Add New Skill',
          `
            <form id="modal-skill-form" onsubmit="return false;">
              <div class="form-group mb-3">
                <label class="form-label" for="skill-modal-name">Skill Name <span class="required">*</span></label>
                <input type="text" id="skill-modal-name" class="form-control" placeholder="e.g. JavaScript, Python, Docker" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="skill-modal-category">Category <span class="required">*</span></label>
                <input type="text" id="skill-modal-category" class="form-control" placeholder="e.g. Programming Languages, Web Development, Tools" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="skill-modal-icon">Icon Class (Font Awesome)</label>
                <input type="text" id="skill-modal-icon" class="form-control" placeholder="e.g. fab fa-js, fas fa-database">
                <small class="form-text text-muted">Example: <code>fab fa-python</code>, <code>fas fa-code</code></small>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="skill-modal-sort">Sort Order</label>
                <input type="number" id="skill-modal-sort" class="form-control" value="0" min="0">
              </div>
            </form>
          `,
          async () => {
            const name = document.getElementById('skill-modal-name')?.value.trim();
            const category = document.getElementById('skill-modal-category')?.value.trim();
            const icon = document.getElementById('skill-modal-icon')?.value.trim() || '';
            const sort_order = parseInt(document.getElementById('skill-modal-sort')?.value, 10) || 0;

            if (!name || !category) {
              showAdminToast('Please fill in both Skill Name and Category', 'error');
              return;
            }

            const res = await adminFetch('/api/admin/skills', {
              method: 'POST',
              body: JSON.stringify({ name, category, icon, sort_order })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to add skill');
            }

            showAdminToast('Skill added successfully!', 'success');
            closeModal();
            loadSkills();
          }
        );
      });
    }

    const skillsList = document.getElementById('skills-list');
    if (skillsList) {
      skillsList.addEventListener('click', async (e) => {
        // Edit button click
        const editBtn = e.target.closest('.edit-skill-btn');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const skill = cachedSkills.find((s) => String(s.id) === String(id));
          if (!skill) return;

          openModal(
            'Edit Skill',
            `
              <form id="modal-skill-form" onsubmit="return false;">
                <div class="form-group mb-3">
                  <label class="form-label" for="skill-modal-name">Skill Name <span class="required">*</span></label>
                  <input type="text" id="skill-modal-name" class="form-control" value="${escapeHTML(skill.name)}" required>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="skill-modal-category">Category <span class="required">*</span></label>
                  <input type="text" id="skill-modal-category" class="form-control" value="${escapeHTML(skill.category)}" required>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="skill-modal-icon">Icon Class (Font Awesome)</label>
                  <input type="text" id="skill-modal-icon" class="form-control" value="${escapeHTML(skill.icon || '')}">
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="skill-modal-sort">Sort Order</label>
                  <input type="number" id="skill-modal-sort" class="form-control" value="${skill.sort_order || 0}" min="0">
                </div>
              </form>
            `,
            async () => {
              const name = document.getElementById('skill-modal-name')?.value.trim();
              const category = document.getElementById('skill-modal-category')?.value.trim();
              const icon = document.getElementById('skill-modal-icon')?.value.trim() || '';
              const sort_order = parseInt(document.getElementById('skill-modal-sort')?.value, 10) || 0;

              if (!name || !category) {
                showAdminToast('Please fill in both Skill Name and Category', 'error');
                return;
              }

              const res = await adminFetch(`/api/admin/skills/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, category, icon, sort_order })
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update skill');
              }

              showAdminToast('Skill updated successfully!', 'success');
              closeModal();
              loadSkills();
            }
          );
          return;
        }

        // Delete button click
        const deleteBtn = e.target.closest('.delete-skill-btn');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          const confirmed = await showConfirm('Are you sure you want to delete this skill?');
          if (confirmed) {
            try {
              const res = await adminFetch(`/api/admin/skills/${id}`, {
                method: 'DELETE'
              });
              if (!res.ok) throw new Error('Failed to delete skill');
              showAdminToast('Skill deleted successfully', 'success');
              loadSkills();
            } catch (err) {
              console.error('Delete skill error:', err);
              showAdminToast(err.message || 'Failed to delete skill', 'error');
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // 8. PROJECTS PANEL
  // =========================================================================

  /**
   * Fetch and render projects list
   */
  async function loadProjects() {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    try {
      const res = await adminFetch('/api/admin/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      cachedProjects = await res.json();

      updateCount('stat-projects', cachedProjects.length);
      updateCount('total-projects', cachedProjects.length);

      if (cachedProjects.length === 0) {
        projectsList.innerHTML = `
          <div class="empty-state p-4 text-center text-muted">
            <i class="fas fa-laptop-code fa-2x mb-2"></i>
            <p>No projects created yet. Click "Add Project" to add your work.</p>
          </div>
        `;
        return;
      }

      projectsList.innerHTML = cachedProjects
        .map((proj) => {
          const imageHtml = proj.image
            ? `<img src="${escapeHTML(proj.image)}" alt="${escapeHTML(proj.title)}" class="project-thumb-img">`
            : `<div class="project-thumb-placeholder"><i class="fas fa-image"></i></div>`;

          const techBadges = (proj.technologies || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => `<span class="badge badge-subtle">${escapeHTML(t)}</span>`)
            .join(' ');

          return `
            <div class="admin-item-row project-item" data-id="${proj.id}">
              <div class="item-left d-flex align-items-center gap-3">
                <div class="project-thumb-wrapper">${imageHtml}</div>
                <div class="project-details">
                  <h4 class="item-title mb-1 font-semibold">${escapeHTML(proj.title)}</h4>
                  <p class="item-description text-muted mb-1">${escapeHTML(truncateText(proj.description, 90))}</p>
                  <div class="project-tags mt-1">${techBadges}</div>
                </div>
              </div>
              <div class="item-actions d-flex gap-2">
                <button type="button" class="btn btn-sm btn-edit edit-project-btn" data-id="${proj.id}" title="Edit Project">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="btn btn-sm btn-danger delete-project-btn" data-id="${proj.id}" title="Delete Project">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      console.error('loadProjects error:', err);
      showAdminToast(err.message || 'Error loading projects', 'error');
    }
  }

  /**
   * Set up Project panel actions (Add, Edit, Delete via delegation)
   */
  function setupProjectsActions() {
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => {
        openModal(
          'Add New Project',
          `
            <form id="modal-project-form" onsubmit="return false;">
              <div class="form-group mb-3">
                <label class="form-label" for="proj-modal-title">Project Title <span class="required">*</span></label>
                <input type="text" id="proj-modal-title" class="form-control" placeholder="e.g. SmartCity 360" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="proj-modal-description">Description</label>
                <textarea id="proj-modal-description" class="form-control" rows="3" placeholder="Brief overview of project architecture and goal"></textarea>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="proj-modal-image">Project Cover Image</label>
                <input type="file" id="proj-modal-image" class="form-control" accept="image/*">
                <small class="form-text text-muted">Supports PNG, JPG, WebP, SVG (Max 5MB)</small>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="proj-modal-tech">Technologies (comma-separated)</label>
                <input type="text" id="proj-modal-tech" class="form-control" placeholder="e.g. Node.js, Express, SQLite, Chart.js">
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="proj-modal-features">Key Features (one per line)</label>
                <textarea id="proj-modal-features" class="form-control" rows="3" placeholder="Real-time telemetry&#10;Interactive map view&#10;Automated alert notifications"></textarea>
              </div>
              <div class="row mb-3">
                <div class="col-6">
                  <label class="form-label" for="proj-modal-github">GitHub Repository URL</label>
                  <input type="url" id="proj-modal-github" class="form-control" placeholder="https://github.com/...">
                </div>
                <div class="col-6">
                  <label class="form-label" for="proj-modal-demo">Live Demo URL</label>
                  <input type="url" id="proj-modal-demo" class="form-control" placeholder="https://demo.example.com">
                </div>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="proj-modal-sort">Sort Order</label>
                <input type="number" id="proj-modal-sort" class="form-control" value="0" min="0">
              </div>
            </form>
          `,
          async () => {
            const title = document.getElementById('proj-modal-title')?.value.trim();
            if (!title) {
              showAdminToast('Project title is required', 'error');
              return;
            }

            const description = document.getElementById('proj-modal-description')?.value || '';
            const technologies = document.getElementById('proj-modal-tech')?.value || '';
            const features = document.getElementById('proj-modal-features')?.value || '';
            const github_url = document.getElementById('proj-modal-github')?.value || '';
            const demo_url = document.getElementById('proj-modal-demo')?.value || '';
            const sort_order = document.getElementById('proj-modal-sort')?.value || '0';

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('technologies', technologies);
            formData.append('features', features);
            formData.append('github_url', github_url);
            formData.append('demo_url', demo_url);
            formData.append('sort_order', sort_order);

            const fileInput = document.getElementById('proj-modal-image');
            if (fileInput && fileInput.files && fileInput.files[0]) {
              formData.append('image', fileInput.files[0]);
            }

            const res = await adminFetch('/api/admin/projects', {
              method: 'POST',
              body: formData
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to create project');
            }

            showAdminToast('Project added successfully!', 'success');
            closeModal();
            loadProjects();
          }
        );
      });
    }

    const projectsList = document.getElementById('projects-list');
    if (projectsList) {
      projectsList.addEventListener('click', async (e) => {
        // Edit button click
        const editBtn = e.target.closest('.edit-project-btn');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const proj = cachedProjects.find((p) => String(p.id) === String(id));
          if (!proj) return;

          // Convert features array/csv to lines for textarea display
          const featuresLines = (proj.features || '')
            .split(/[\r\n,]+/)
            .map((f) => f.trim())
            .filter(Boolean)
            .join('\n');

          openModal(
            'Edit Project',
            `
              <form id="modal-project-form" onsubmit="return false;">
                <div class="form-group mb-3">
                  <label class="form-label" for="proj-modal-title">Project Title <span class="required">*</span></label>
                  <input type="text" id="proj-modal-title" class="form-control" value="${escapeHTML(proj.title)}" required>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="proj-modal-description">Description</label>
                  <textarea id="proj-modal-description" class="form-control" rows="3">${escapeHTML(proj.description || '')}</textarea>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="proj-modal-image">Update Project Image</label>
                  ${
                    proj.image
                      ? `<div class="current-img-preview mb-2"><img src="${escapeHTML(proj.image)}" style="max-height: 80px; border-radius: 4px;" alt="Current Cover"></div>`
                      : ''
                  }
                  <input type="file" id="proj-modal-image" class="form-control" accept="image/*">
                  <small class="form-text text-muted">Leave empty to keep existing image</small>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="proj-modal-tech">Technologies (comma-separated)</label>
                  <input type="text" id="proj-modal-tech" class="form-control" value="${escapeHTML(proj.technologies || '')}">
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="proj-modal-features">Key Features (one per line)</label>
                  <textarea id="proj-modal-features" class="form-control" rows="3">${escapeHTML(featuresLines)}</textarea>
                </div>
                <div class="row mb-3">
                  <div class="col-6">
                    <label class="form-label" for="proj-modal-github">GitHub Repository URL</label>
                    <input type="url" id="proj-modal-github" class="form-control" value="${escapeHTML(proj.github_url || '')}">
                  </div>
                  <div class="col-6">
                    <label class="form-label" for="proj-modal-demo">Live Demo URL</label>
                    <input type="url" id="proj-modal-demo" class="form-control" value="${escapeHTML(proj.demo_url || '')}">
                  </div>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="proj-modal-sort">Sort Order</label>
                  <input type="number" id="proj-modal-sort" class="form-control" value="${proj.sort_order || 0}" min="0">
                </div>
              </form>
            `,
            async () => {
              const title = document.getElementById('proj-modal-title')?.value.trim();
              if (!title) {
                showAdminToast('Project title is required', 'error');
                return;
              }

              const description = document.getElementById('proj-modal-description')?.value || '';
              const technologies = document.getElementById('proj-modal-tech')?.value || '';
              const features = document.getElementById('proj-modal-features')?.value || '';
              const github_url = document.getElementById('proj-modal-github')?.value || '';
              const demo_url = document.getElementById('proj-modal-demo')?.value || '';
              const sort_order = document.getElementById('proj-modal-sort')?.value || '0';

              const formData = new FormData();
              formData.append('title', title);
              formData.append('description', description);
              formData.append('technologies', technologies);
              formData.append('features', features);
              formData.append('github_url', github_url);
              formData.append('demo_url', demo_url);
              formData.append('sort_order', sort_order);

              const fileInput = document.getElementById('proj-modal-image');
              if (fileInput && fileInput.files && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
              }

              const res = await adminFetch(`/api/admin/projects/${id}`, {
                method: 'PUT',
                body: formData
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update project');
              }

              showAdminToast('Project updated successfully!', 'success');
              closeModal();
              loadProjects();
            }
          );
          return;
        }

        // Delete button click
        const deleteBtn = e.target.closest('.delete-project-btn');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          const confirmed = await showConfirm('Are you sure you want to delete this project? This will also remove any uploaded project image.');
          if (confirmed) {
            try {
              const res = await adminFetch(`/api/admin/projects/${id}`, {
                method: 'DELETE'
              });
              if (!res.ok) throw new Error('Failed to delete project');
              showAdminToast('Project deleted successfully', 'success');
              loadProjects();
            } catch (err) {
              console.error('Delete project error:', err);
              showAdminToast(err.message || 'Failed to delete project', 'error');
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // 9. EDUCATION PANEL
  // =========================================================================

  /**
   * Fetch and render education milestones
   */
  async function loadEducation() {
    const educationList = document.getElementById('education-list');
    if (!educationList) return;

    try {
      const res = await adminFetch('/api/admin/education');
      if (!res.ok) throw new Error('Failed to load education entries');
      cachedEducation = await res.json();

      updateCount('stat-education', cachedEducation.length);
      updateCount('total-education', cachedEducation.length);

      if (cachedEducation.length === 0) {
        educationList.innerHTML = `
          <div class="empty-state p-4 text-center text-muted">
            <i class="fas fa-graduation-cap fa-2x mb-2"></i>
            <p>No education entries recorded yet. Click "Add Education" to add one.</p>
          </div>
        `;
        return;
      }

      educationList.innerHTML = cachedEducation
        .map((edu) => `
          <div class="admin-item-row education-item" data-id="${edu.id}">
            <div class="item-main-info">
              <h4 class="item-title mb-1 font-semibold">${escapeHTML(edu.degree)}</h4>
              <p class="item-subtitle text-muted mb-1">
                <i class="fas fa-university"></i> ${escapeHTML(edu.college)}${edu.branch ? ` &bull; ${escapeHTML(edu.branch)}` : ''}
              </p>
              <div class="d-flex gap-2 align-items-center">
                ${edu.academic_year ? `<span class="badge badge-subtle">${escapeHTML(edu.academic_year)}</span>` : ''}
                ${edu.semester ? `<span class="badge badge-subtle">${escapeHTML(edu.semester)}</span>` : ''}
              </div>
            </div>
            <div class="item-actions d-flex gap-2">
              <button type="button" class="btn btn-sm btn-edit edit-education-btn" data-id="${edu.id}" title="Edit Education">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button type="button" class="btn btn-sm btn-danger delete-education-btn" data-id="${edu.id}" title="Delete Education">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
        `)
        .join('');
    } catch (err) {
      console.error('loadEducation error:', err);
      showAdminToast(err.message || 'Error loading education', 'error');
    }
  }

  /**
   * Set up Education panel actions (Add, Edit, Delete via delegation)
   */
  function setupEducationActions() {
    const addEduBtn = document.getElementById('add-education-btn');
    if (addEduBtn) {
      addEduBtn.addEventListener('click', () => {
        openModal(
          'Add Education Milestone',
          `
            <form id="modal-education-form" onsubmit="return false;">
              <div class="form-group mb-3">
                <label class="form-label" for="edu-modal-college">College / Institution <span class="required">*</span></label>
                <input type="text" id="edu-modal-college" class="form-control" placeholder="e.g. Department of Computer Science & Engineering" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="edu-modal-degree">Degree <span class="required">*</span></label>
                <input type="text" id="edu-modal-degree" class="form-control" placeholder="e.g. B.Tech in Computer Science and Engineering" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="edu-modal-branch">Branch / Specialization</label>
                <input type="text" id="edu-modal-branch" class="form-control" placeholder="e.g. Computer Science and Engineering">
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="edu-modal-university">University</label>
                <input type="text" id="edu-modal-university" class="form-control" placeholder="e.g. State Technological University">
              </div>
              <div class="row mb-3">
                <div class="col-6">
                  <label class="form-label" for="edu-modal-year">Academic Year</label>
                  <input type="text" id="edu-modal-year" class="form-control" placeholder="e.g. 2022 - 2026">
                </div>
                <div class="col-6">
                  <label class="form-label" for="edu-modal-semester">Semester / Status</label>
                  <input type="text" id="edu-modal-semester" class="form-control" placeholder="e.g. 6th Semester">
                </div>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="edu-modal-achievements">Achievements & Highlights</label>
                <textarea id="edu-modal-achievements" class="form-control" rows="3" placeholder="Honors, Dean's List, hackathon achievements..."></textarea>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="edu-modal-sort">Sort Order</label>
                <input type="number" id="edu-modal-sort" class="form-control" value="0" min="0">
              </div>
            </form>
          `,
          async () => {
            const college = document.getElementById('edu-modal-college')?.value.trim();
            const degree = document.getElementById('edu-modal-degree')?.value.trim();

            if (!college || !degree) {
              showAdminToast('Please fill in both College and Degree', 'error');
              return;
            }

            const payload = {
              college,
              degree,
              branch: document.getElementById('edu-modal-branch')?.value.trim() || '',
              university: document.getElementById('edu-modal-university')?.value.trim() || '',
              academic_year: document.getElementById('edu-modal-year')?.value.trim() || '',
              semester: document.getElementById('edu-modal-semester')?.value.trim() || '',
              achievements: document.getElementById('edu-modal-achievements')?.value.trim() || '',
              sort_order: parseInt(document.getElementById('edu-modal-sort')?.value, 10) || 0
            };

            const res = await adminFetch('/api/admin/education', {
              method: 'POST',
              body: JSON.stringify(payload)
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to add education entry');
            }

            showAdminToast('Education milestone added successfully!', 'success');
            closeModal();
            loadEducation();
          }
        );
      });
    }

    const educationList = document.getElementById('education-list');
    if (educationList) {
      educationList.addEventListener('click', async (e) => {
        // Edit button click
        const editBtn = e.target.closest('.edit-education-btn');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const edu = cachedEducation.find((item) => String(item.id) === String(id));
          if (!edu) return;

          openModal(
            'Edit Education Milestone',
            `
              <form id="modal-education-form" onsubmit="return false;">
                <div class="form-group mb-3">
                  <label class="form-label" for="edu-modal-college">College / Institution <span class="required">*</span></label>
                  <input type="text" id="edu-modal-college" class="form-control" value="${escapeHTML(edu.college)}" required>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="edu-modal-degree">Degree <span class="required">*</span></label>
                  <input type="text" id="edu-modal-degree" class="form-control" value="${escapeHTML(edu.degree)}" required>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="edu-modal-branch">Branch / Specialization</label>
                  <input type="text" id="edu-modal-branch" class="form-control" value="${escapeHTML(edu.branch || '')}">
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="edu-modal-university">University</label>
                  <input type="text" id="edu-modal-university" class="form-control" value="${escapeHTML(edu.university || '')}">
                </div>
                <div class="row mb-3">
                  <div class="col-6">
                    <label class="form-label" for="edu-modal-year">Academic Year</label>
                    <input type="text" id="edu-modal-year" class="form-control" value="${escapeHTML(edu.academic_year || '')}">
                  </div>
                  <div class="col-6">
                    <label class="form-label" for="edu-modal-semester">Semester / Status</label>
                    <input type="text" id="edu-modal-semester" class="form-control" value="${escapeHTML(edu.semester || '')}">
                  </div>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="edu-modal-achievements">Achievements & Highlights</label>
                  <textarea id="edu-modal-achievements" class="form-control" rows="3">${escapeHTML(edu.achievements || '')}</textarea>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="edu-modal-sort">Sort Order</label>
                  <input type="number" id="edu-modal-sort" class="form-control" value="${edu.sort_order || 0}" min="0">
                </div>
              </form>
            `,
            async () => {
              const college = document.getElementById('edu-modal-college')?.value.trim();
              const degree = document.getElementById('edu-modal-degree')?.value.trim();

              if (!college || !degree) {
                showAdminToast('Please fill in both College and Degree', 'error');
                return;
              }

              const payload = {
                college,
                degree,
                branch: document.getElementById('edu-modal-branch')?.value.trim() || '',
                university: document.getElementById('edu-modal-university')?.value.trim() || '',
                academic_year: document.getElementById('edu-modal-year')?.value.trim() || '',
                semester: document.getElementById('edu-modal-semester')?.value.trim() || '',
                achievements: document.getElementById('edu-modal-achievements')?.value.trim() || '',
                sort_order: parseInt(document.getElementById('edu-modal-sort')?.value, 10) || 0
              };

              const res = await adminFetch(`/api/admin/education/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update education entry');
              }

              showAdminToast('Education milestone updated successfully!', 'success');
              closeModal();
              loadEducation();
            }
          );
          return;
        }

        // Delete button click
        const deleteBtn = e.target.closest('.delete-education-btn');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          const confirmed = await showConfirm('Are you sure you want to delete this education entry?');
          if (confirmed) {
            try {
              const res = await adminFetch(`/api/admin/education/${id}`, {
                method: 'DELETE'
              });
              if (!res.ok) throw new Error('Failed to delete education entry');
              showAdminToast('Education entry deleted successfully', 'success');
              loadEducation();
            } catch (err) {
              console.error('Delete education error:', err);
              showAdminToast(err.message || 'Failed to delete education entry', 'error');
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // 10. CERTIFICATES PANEL
  // =========================================================================

  /**
   * Fetch and render certificates list
   */
  async function loadCertificates() {
    const certList = document.getElementById('certificates-list');
    if (!certList) return;

    try {
      const res = await adminFetch('/api/admin/certificates');
      if (!res.ok) throw new Error('Failed to load certificates');
      cachedCertificates = await res.json();

      updateCount('stat-certificates', cachedCertificates.length);
      updateCount('total-certificates', cachedCertificates.length);

      if (cachedCertificates.length === 0) {
        certList.innerHTML = `
          <div class="empty-state p-4 text-center text-muted">
            <i class="fas fa-certificate fa-2x mb-2"></i>
            <p>No certificates recorded yet. Click "Add Certificate" to showcase certifications.</p>
          </div>
        `;
        return;
      }

      certList.innerHTML = cachedCertificates
        .map((cert) => {
          const isPdf = cert.image && cert.image.toLowerCase().endsWith('.pdf');
          const previewHtml = cert.image
            ? isPdf
              ? `<div class="cert-pdf-badge"><i class="fas fa-file-pdf text-danger fa-2x"></i></div>`
              : `<img src="${escapeHTML(cert.image)}" alt="${escapeHTML(cert.title)}" class="cert-thumb-img">`
            : `<div class="cert-placeholder"><i class="fas fa-certificate fa-2x"></i></div>`;

          return `
            <div class="admin-item-row certificate-item" data-id="${cert.id}">
              <div class="item-left d-flex align-items-center gap-3">
                <div class="cert-thumb-wrapper">${previewHtml}</div>
                <div class="cert-details">
                  <h4 class="item-title mb-1 font-semibold">${escapeHTML(cert.title)}</h4>
                  <p class="item-subtitle text-muted mb-1">
                    <i class="fas fa-building"></i> ${escapeHTML(cert.organization)}
                    ${cert.issue_date ? ` &bull; <i class="fas fa-calendar-alt"></i> ${escapeHTML(cert.issue_date)}` : ''}
                  </p>
                  ${
                    cert.cert_url
                      ? `<a href="${escapeHTML(cert.cert_url)}" target="_blank" rel="noopener noreferrer" class="link-verify text-xs text-primary">
                          <i class="fas fa-external-link-alt"></i> Verify Link
                        </a>`
                      : ''
                  }
                </div>
              </div>
              <div class="item-actions d-flex gap-2">
                <button type="button" class="btn btn-sm btn-edit edit-certificate-btn" data-id="${cert.id}" title="Edit Certificate">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="btn btn-sm btn-danger delete-certificate-btn" data-id="${cert.id}" title="Delete Certificate">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      console.error('loadCertificates error:', err);
      showAdminToast(err.message || 'Error loading certificates', 'error');
    }
  }

  /**
   * Set up Certificate panel actions (Add, Edit, Delete via delegation)
   */
  function setupCertificatesActions() {
    const addCertBtn = document.getElementById('add-certificate-btn');
    if (addCertBtn) {
      addCertBtn.addEventListener('click', () => {
        openModal(
          'Add Certificate',
          `
            <form id="modal-cert-form" onsubmit="return false;">
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-title">Certificate Title <span class="required">*</span></label>
                <input type="text" id="cert-modal-title" class="form-control" placeholder="e.g. AWS Certified Solutions Architect" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-org">Issuing Organization <span class="required">*</span></label>
                <input type="text" id="cert-modal-org" class="form-control" placeholder="e.g. Amazon Web Services, Google Cloud, Coursera" required>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-date">Issue Date</label>
                <input type="text" id="cert-modal-date" class="form-control" placeholder="e.g. Nov 2024 or 2024-11">
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-desc">Description</label>
                <textarea id="cert-modal-desc" class="form-control" rows="2" placeholder="Skills demonstrated, credentials acquired"></textarea>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-image">Certificate File (Image or PDF)</label>
                <input type="file" id="cert-modal-image" class="form-control" accept="image/*,.pdf">
                <small class="form-text text-muted">Supports JPG, PNG, WebP, SVG, and PDF documents (Max 10MB)</small>
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-url">Verification / Credential URL</label>
                <input type="url" id="cert-modal-url" class="form-control" placeholder="https://coursera.org/verify/...">
              </div>
              <div class="form-group mb-3">
                <label class="form-label" for="cert-modal-sort">Sort Order</label>
                <input type="number" id="cert-modal-sort" class="form-control" value="0" min="0">
              </div>
            </form>
          `,
          async () => {
            const title = document.getElementById('cert-modal-title')?.value.trim();
            const organization = document.getElementById('cert-modal-org')?.value.trim();

            if (!title) {
              showAdminToast('Certificate title is required', 'error');
              return;
            }

            const formData = new FormData();
            formData.append('title', title);
            formData.append('organization', organization || '');
            formData.append('issue_date', document.getElementById('cert-modal-date')?.value.trim() || '');
            formData.append('description', document.getElementById('cert-modal-desc')?.value.trim() || '');
            formData.append('cert_url', document.getElementById('cert-modal-url')?.value.trim() || '');
            formData.append('sort_order', document.getElementById('cert-modal-sort')?.value || '0');

            const fileInput = document.getElementById('cert-modal-image');
            if (fileInput && fileInput.files && fileInput.files[0]) {
              formData.append('image', fileInput.files[0]);
            }

            const res = await adminFetch('/api/admin/certificates', {
              method: 'POST',
              body: formData
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to add certificate');
            }

            showAdminToast('Certificate added successfully!', 'success');
            closeModal();
            loadCertificates();
          }
        );
      });
    }

    const certList = document.getElementById('certificates-list');
    if (certList) {
      certList.addEventListener('click', async (e) => {
        // Edit button click
        const editBtn = e.target.closest('.edit-certificate-btn');
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const cert = cachedCertificates.find((c) => String(c.id) === String(id));
          if (!cert) return;

          openModal(
            'Edit Certificate',
            `
              <form id="modal-cert-form" onsubmit="return false;">
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-title">Certificate Title <span class="required">*</span></label>
                  <input type="text" id="cert-modal-title" class="form-control" value="${escapeHTML(cert.title)}" required>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-org">Issuing Organization</label>
                  <input type="text" id="cert-modal-org" class="form-control" value="${escapeHTML(cert.organization || '')}">
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-date">Issue Date</label>
                  <input type="text" id="cert-modal-date" class="form-control" value="${escapeHTML(cert.issue_date || '')}">
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-desc">Description</label>
                  <textarea id="cert-modal-desc" class="form-control" rows="2">${escapeHTML(cert.description || '')}</textarea>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-image">Update File (Image or PDF)</label>
                  ${
                    cert.image
                      ? `<div class="current-cert-file mb-2">Current: <a href="${escapeHTML(cert.image)}" target="_blank" class="text-primary font-medium underline">${escapeHTML(cert.image.split('/').pop())}</a></div>`
                      : ''
                  }
                  <input type="file" id="cert-modal-image" class="form-control" accept="image/*,.pdf">
                  <small class="form-text text-muted">Leave empty to keep current file</small>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-url">Verification / Credential URL</label>
                  <input type="url" id="cert-modal-url" class="form-control" value="${escapeHTML(cert.cert_url || '')}">
                </div>
                <div class="form-group mb-3">
                  <label class="form-label" for="cert-modal-sort">Sort Order</label>
                  <input type="number" id="cert-modal-sort" class="form-control" value="${cert.sort_order || 0}" min="0">
                </div>
              </form>
            `,
            async () => {
              const title = document.getElementById('cert-modal-title')?.value.trim();
              if (!title) {
                showAdminToast('Certificate title is required', 'error');
                return;
              }

              const formData = new FormData();
              formData.append('title', title);
              formData.append('organization', document.getElementById('cert-modal-org')?.value.trim() || '');
              formData.append('issue_date', document.getElementById('cert-modal-date')?.value.trim() || '');
              formData.append('description', document.getElementById('cert-modal-desc')?.value.trim() || '');
              formData.append('cert_url', document.getElementById('cert-modal-url')?.value.trim() || '');
              formData.append('sort_order', document.getElementById('cert-modal-sort')?.value || '0');

              const fileInput = document.getElementById('cert-modal-image');
              if (fileInput && fileInput.files && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
              }

              const res = await adminFetch(`/api/admin/certificates/${id}`, {
                method: 'PUT',
                body: formData
              });

              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update certificate');
              }

              showAdminToast('Certificate updated successfully!', 'success');
              closeModal();
              loadCertificates();
            }
          );
          return;
        }

        // Delete button click
        const deleteBtn = e.target.closest('.delete-certificate-btn');
        if (deleteBtn) {
          const id = deleteBtn.getAttribute('data-id');
          const confirmed = await showConfirm('Are you sure you want to delete this certificate? This will also remove the uploaded file.');
          if (confirmed) {
            try {
              const res = await adminFetch(`/api/admin/certificates/${id}`, {
                method: 'DELETE'
              });
              if (!res.ok) throw new Error('Failed to delete certificate');
              showAdminToast('Certificate deleted successfully', 'success');
              loadCertificates();
            } catch (err) {
              console.error('Delete certificate error:', err);
              showAdminToast(err.message || 'Failed to delete certificate', 'error');
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // 11. RESUME PANEL
  // =========================================================================

  /**
   * Fetch profile data and update resume status and iframe preview
   */
  async function loadResume() {
    try {
      const res = await adminFetch('/api/admin/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      const profile = await res.json();

      const statusEl = document.getElementById('resume-status');
      const previewArea = document.getElementById('resume-preview-area');

      if (profile.resume_path) {
        const fileName = profile.resume_path.split('/').pop();
        if (statusEl) {
          statusEl.innerHTML = `
            <div class="resume-active-badge d-flex align-items-center gap-2">
              <i class="fas fa-file-pdf text-danger fa-lg"></i>
              <span>Active Resume: <strong>${escapeHTML(fileName)}</strong></span>
              <a href="${escapeHTML(profile.resume_path)}" target="_blank" class="btn btn-sm btn-outline ms-2" rel="noopener">
                <i class="fas fa-external-link-alt"></i> Open in New Tab
              </a>
            </div>
          `;
        }

        if (previewArea) {
          previewArea.innerHTML = `
            <div class="resume-embed-container mt-3" style="width: 100%; height: 550px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color, #334155);">
              <iframe src="${escapeHTML(profile.resume_path)}#toolbar=1" width="100%" height="100%" style="border: none;" title="Resume PDF Preview"></iframe>
            </div>
          `;
        }
      } else {
        if (statusEl) {
          statusEl.innerHTML = `<span class="text-muted"><i class="fas fa-info-circle"></i> No resume uploaded yet.</span>`;
        }
        if (previewArea) {
          previewArea.innerHTML = `
            <div class="empty-state p-4 text-center text-muted border border-dashed rounded">
              <i class="fas fa-file-pdf fa-2x mb-2 text-muted"></i>
              <p>No resume uploaded. Select a PDF file below to upload.</p>
            </div>
          `;
        }
      }
    } catch (err) {
      console.error('loadResume error:', err);
    }
  }

  /**
   * Set up Resume upload handler (PDF only, max 10MB)
   */
  function setupResumeUpload() {
    const uploadBtn = document.getElementById('upload-resume-btn');
    const fileInput = document.getElementById('resume-file-input');

    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        showAdminToast('Please select a resume PDF file to upload', 'error');
        return;
      }

      const file = fileInput.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showAdminToast('Invalid file format. Only PDF files are permitted for resumes.', 'error');
        return;
      }

      const origText = uploadBtn.innerHTML;

      try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading Resume...';

        const formData = new FormData();
        formData.append('resume', file);

        const res = await adminFetch('/api/admin/resume', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload resume');

        showAdminToast('Resume uploaded and published successfully!', 'success');
        fileInput.value = '';
        await loadResume();
      } catch (err) {
        console.error('Resume upload error:', err);
        showAdminToast(err.message || 'Failed to upload resume', 'error');
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = origText;
      }
    });
  }

  // =========================================================================
  // 12. MESSAGES PANEL
  // =========================================================================

  /**
   * Update message badge in sidebar with unread counter
   * @param {number} unreadCount
   */
  function updateMessageBadge(unreadCount) {
    const badge = document.getElementById('msg-badge');
    if (!badge) return;

    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
      badge.style.display = 'inline-block';
    } else {
      badge.textContent = '0';
      badge.classList.add('hidden');
      badge.style.display = 'none';
    }
  }

  /**
   * Fetch and render visitor contact messages
   */
  async function loadMessages() {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;

    try {
      const res = await adminFetch('/api/admin/messages');
      if (!res.ok) throw new Error('Failed to load contact messages');
      cachedMessages = await res.json();

      const unreadCount = cachedMessages.filter((m) => !m.is_read).length;
      updateCount('stat-messages', cachedMessages.length);
      updateCount('total-messages', cachedMessages.length);
      updateCount('stat-unread-messages', unreadCount);
      updateMessageBadge(unreadCount);

      if (cachedMessages.length === 0) {
        messagesList.innerHTML = `
          <div class="empty-state p-4 text-center text-muted">
            <i class="fas fa-inbox fa-2x mb-2"></i>
            <p>Your inbox is empty. No contact messages received yet.</p>
          </div>
        `;
        return;
      }

      messagesList.innerHTML = cachedMessages
        .map((msg) => {
          const isUnread = !msg.is_read;
          const statusClass = isUnread ? 'unread' : 'read';

          return `
            <div class="message-card admin-item-card ${statusClass}" data-id="${msg.id}">
              <div class="message-header d-flex justify-content-between align-items-center">
                <div class="message-summary d-flex align-items-center gap-2">
                  <span class="status-indicator-dot ${isUnread ? 'dot-unread' : 'dot-read'}" title="${isUnread ? 'Unread message' : 'Read'}"></span>
                  <span class="sender-name font-semibold">${escapeHTML(msg.name)}</span>
                  <span class="sender-email text-muted">&lt;${escapeHTML(msg.email)}&gt;</span>
                </div>
                <div class="message-meta d-flex align-items-center gap-3">
                  <span class="message-date text-xs text-muted">${formatDate(msg.created_at)}</span>
                  <button type="button" class="btn btn-sm btn-danger delete-message-btn" data-id="${msg.id}" title="Delete Message">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="message-subject-line mt-1">
                <strong>Subject:</strong> ${escapeHTML(msg.subject || '(No Subject)')}
              </div>
              <div class="message-body hidden mt-2 pt-2 border-top">
                <p class="message-text" style="white-space: pre-wrap;">${escapeHTML(msg.message)}</p>
                <div class="message-actions mt-3 d-flex gap-2">
                  <a href="mailto:${escapeHTML(msg.email)}?subject=Re: ${encodeURIComponent(msg.subject || 'Portfolio Inquiry')}" class="btn btn-sm btn-primary">
                    <i class="fas fa-reply"></i> Reply via Email
                  </a>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      console.error('loadMessages error:', err);
      showAdminToast(err.message || 'Error loading contact messages', 'error');
    }
  }

  /**
   * Set up message interactions (click to expand/mark read, delete)
   */
  function setupMessagesActions() {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;

    messagesList.addEventListener('click', async (e) => {
      // 1. Check if delete button was clicked
      const deleteBtn = e.target.closest('.delete-message-btn');
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.getAttribute('data-id');
        const confirmed = await showConfirm('Are you sure you want to delete this message?');
        if (confirmed) {
          try {
            const res = await adminFetch(`/api/admin/messages/${id}`, {
              method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete message');
            showAdminToast('Message deleted successfully', 'success');
            loadMessages();
          } catch (err) {
            console.error('Delete message error:', err);
            showAdminToast(err.message || 'Failed to delete message', 'error');
          }
        }
        return;
      }

      // 2. Expand/Collapse message card
      const messageCard = e.target.closest('.message-card');
      if (!messageCard) return;

      const bodyEl = messageCard.querySelector('.message-body');
      if (!bodyEl) return;

      const isExpanded = messageCard.classList.contains('expanded');

      if (isExpanded) {
        messageCard.classList.remove('expanded');
        bodyEl.classList.add('hidden');
      } else {
        messageCard.classList.add('expanded');
        bodyEl.classList.remove('hidden');

        // If unread, mark it as read on the backend
        if (messageCard.classList.contains('unread')) {
          const id = messageCard.getAttribute('data-id');
          try {
            const res = await adminFetch(`/api/admin/messages/${id}/read`, {
              method: 'PUT'
            });
            if (res.ok) {
              messageCard.classList.remove('unread');
              messageCard.classList.add('read');
              const dot = messageCard.querySelector('.status-indicator-dot');
              if (dot) {
                dot.classList.remove('dot-unread');
                dot.classList.add('dot-read');
              }
              // Update cached messages and sidebar badge
              const found = cachedMessages.find((m) => String(m.id) === String(id));
              if (found) found.is_read = 1;
              const unread = cachedMessages.filter((m) => !m.is_read).length;
              updateMessageBadge(unread);
              updateCount('stat-unread-messages', unread);
            }
          } catch (err) {
            console.warn('Failed to mark message as read:', err);
          }
        }
      }
    });
  }

  // =========================================================================
  // 13. SOCIAL LINKS PANEL
  // =========================================================================

  /**
   * Fetch profile and populate social link inputs
   */
  async function loadSocial() {
    try {
      const res = await adminFetch('/api/admin/profile');
      if (!res.ok) throw new Error('Failed to load social links');
      const profile = await res.json();

      const githubInput =
        document.getElementById('social-github-url') ||
        document.getElementById('social-github');

      const linkedinInput =
        document.getElementById('social-linkedin-url') ||
        document.getElementById('social-linkedin');

      const emailInput =
        document.getElementById('social-email-input') ||
        document.getElementById('social-email');

      if (githubInput) githubInput.value = profile.github_url || '';
      if (linkedinInput) linkedinInput.value = profile.linkedin_url || '';
      if (emailInput) emailInput.value = profile.email || '';
    } catch (err) {
      console.error('loadSocial error:', err);
    }
  }

  /**
   * Set up Social links form submission (JSON body)
   */
  function setupSocialForm() {
    const socialForm = document.getElementById('social-form');
    if (!socialForm) return;

    socialForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = socialForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : 'Save Social Links';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const github_url =
          document.getElementById('social-github-url')?.value ||
          document.getElementById('social-github')?.value ||
          '';

        const linkedin_url =
          document.getElementById('social-linkedin-url')?.value ||
          document.getElementById('social-linkedin')?.value ||
          '';

        const email =
          document.getElementById('social-email-input')?.value ||
          document.getElementById('social-email')?.value ||
          '';

        const res = await adminFetch('/api/admin/social', {
          method: 'PUT',
          body: JSON.stringify({ github_url, linkedin_url, email })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update social links');

        showAdminToast('Social links updated successfully!', 'success');
      } catch (err) {
        console.error('Social update error:', err);
        showAdminToast(err.message || 'Failed to update social links', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      }
    });
  }

  // =========================================================================
  // 14. MODAL MANAGEMENT
  // =========================================================================

  /**
   * Open the admin modal dialog
   * @param {string} title
   * @param {string} bodyHtml
   * @param {Function} onSave Async function to execute on save button click
   */
  function openModal(title, bodyHtml, onSave) {
    const modal = document.getElementById('admin-modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    currentModalSaveCallback = onSave;

    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');

      // Autofocus first interactive element in modal
      setTimeout(() => {
        const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
        if (firstInput) firstInput.focus();
      }, 60);
    }
  }

  /**
   * Close the admin modal dialog
   */
  function closeModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
    currentModalSaveCallback = null;
  }

  /**
   * Wire up modal close triggers, overlay click, and save button
   */
  function setupModalHandlers() {
    const modal = document.getElementById('admin-modal');
    const saveBtn = document.getElementById('modal-save-btn');

    // Close triggers
    document
      .querySelectorAll('#modal-close-btn, #modal-cancel-btn, .modal-close')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          closeModal();
        });
      });

    // Close on backdrop overlay click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal-overlay')) {
          closeModal();
        }
      });
    }

    // Modal Save Button Click
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (typeof currentModalSaveCallback === 'function') {
          const origText = saveBtn.innerHTML;
          try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            await currentModalSaveCallback();
          } catch (err) {
            console.error('Modal save error:', err);
            showAdminToast(err.message || 'Operation failed', 'error');
          } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = origText;
          }
        }
      });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  // =========================================================================
  // 15. CONFIRM DIALOG SYSTEM
  // =========================================================================

  /**
   * Display a promise-based confirmation modal dialog
   * @param {string} message Confirmation prompt
   * @returns {Promise<boolean>}
   */
  function showConfirm(message) {
    return new Promise((resolve) => {
      confirmDialogResolver = resolve;
      const confirmDialog = document.getElementById('confirm-dialog');
      const messageEl = document.getElementById('confirm-message');

      if (!confirmDialog) {
        // Fallback to native window.confirm if custom markup is missing
        resolve(window.confirm(message));
        return;
      }

      if (messageEl) {
        messageEl.textContent = message;
      }

      confirmDialog.classList.remove('hidden');
      confirmDialog.setAttribute('aria-hidden', 'false');

      const yesBtn = document.getElementById('confirm-yes');
      if (yesBtn) yesBtn.focus();
    });
  }

  /**
   * Helper to dispatch confirm resolution
   * @param {boolean} result
   */
  function handleConfirmResolution(result) {
    const confirmDialog = document.getElementById('confirm-dialog');
    if (confirmDialog) {
      confirmDialog.classList.add('hidden');
      confirmDialog.setAttribute('aria-hidden', 'true');
    }
    if (confirmDialogResolver) {
      confirmDialogResolver(result);
      confirmDialogResolver = null;
    }
  }

  /**
   * Wire up Confirm Dialog buttons
   */
  function setupConfirmHandlers() {
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    const confirmDialog = document.getElementById('confirm-dialog');

    if (confirmYes) {
      confirmYes.addEventListener('click', (e) => {
        e.preventDefault();
        handleConfirmResolution(true);
      });
    }

    if (confirmNo) {
      confirmNo.addEventListener('click', (e) => {
        e.preventDefault();
        handleConfirmResolution(false);
      });
    }

    if (confirmDialog) {
      confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog || e.target.classList.contains('modal-overlay')) {
          handleConfirmResolution(false);
        }
      });
    }

    // Escape closes confirm dialog with false
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && confirmDialog && !confirmDialog.classList.contains('hidden')) {
        handleConfirmResolution(false);
      }
    });
  }

  // =========================================================================
  // 16. TOAST NOTIFICATION SYSTEM
  // =========================================================================

  /**
   * Show an animated floating toast alert
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   */
  function showAdminToast(message, type = 'success') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.querySelector('.toast-container');
    }
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.className = 'admin-toast-container toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type} toast toast-${type} ${type}`;

    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    else if (type === 'error') icon = 'fas fa-times-circle';
    else if (type === 'warning') icon = 'fas fa-exclamation-triangle';

    toast.innerHTML = `
      <div class="toast-icon"><i class="${icon}"></i></div>
      <div class="toast-content"><span class="toast-message">${escapeHTML(message)}</span></div>
      <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    function removeToast() {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', removeToast);
    }

    setTimeout(removeToast, 4000);
  }

  // =========================================================================
  // 17. INITIALIZATION
  // =========================================================================

  /**
   * Master initialization on DOMContentLoaded
   */
  function init() {
    // 1. Verify authentication and toggle initial page state
    checkAuth();

    // 2. Set up authentication event listeners
    setupLoginForm();
    setupLogout();

    // 3. Set up sidebar navigation & mobile drawer
    setupSidebarNavigation();

    // 3b. Sidebar close button and overlay
    const sidebarCloseBtn = document.getElementById('sidebar-close');
    if (sidebarCloseBtn && sidebar) {
      sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay && sidebar) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }

    // 3c. Quick action buttons and stat cards navigate to panels
    document.querySelectorAll('[data-panel]').forEach((el) => {
      if (!el.classList.contains('nav-item')) {
        el.addEventListener('click', () => {
          const panelId = el.getAttribute('data-panel');
          if (panelId) {
            // Activate the matching sidebar nav item
            document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
            const matchingNav = document.querySelector(`.nav-item[data-panel="${panelId}"]`);
            if (matchingNav) matchingNav.classList.add('active');
            // Show the target panel
            document.querySelectorAll('.dashboard-panel').forEach((p) => p.classList.add('hidden'));
            const target = document.getElementById(panelId);
            if (target) target.classList.remove('hidden');
          }
        });
      }
    });

    // 4. Set up modal and confirm dialog managers
    setupModalHandlers();
    setupConfirmHandlers();

    // 5. Set up form submit handlers
    setupProfileForm();
    setupProfileImagePreview();
    setupAboutForm();
    setupSocialForm();
    setupResumeUpload();

    // 6. Set up action handlers & event delegation for dynamic collections
    setupSkillsActions();
    setupProjectsActions();
    setupEducationActions();
    setupCertificatesActions();
    setupMessagesActions();
  }

  // Expose API utilities to global window for extensibility or testing
  window.adminApp = {
    adminFetch,
    showAdminToast,
    showConfirm,
    openModal,
    closeModal,
    loadDashboardData,
    loadProfile,
    loadAbout,
    loadSkills,
    loadProjects,
    loadEducation,
    loadCertificates,
    loadResume,
    loadMessages,
    loadSocial
  };

  // Launch admin application
  init();
});
