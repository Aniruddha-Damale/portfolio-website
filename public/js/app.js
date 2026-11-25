/**
 * Portfolio Client-Side Application
 * Vanilla JavaScript (ES6+)
 * 
 * Features:
 * - Theme toggle (dark/light) with localStorage persistence
 * - Mobile navigation menu toggle and auto-close
 * - Scroll animations using IntersectionObserver
 * - Active navigation link highlighting on scroll
 * - Back to top smooth scrolling
 * - Navbar elevation on scroll
 * - Dynamic data fetching from REST API endpoints
 * - Dynamic rendering for Hero, About, Skills, Projects, Education, Certificates, and Resume
 * - Interactive Project Details modal
 * - Validated Contact Form submission with inline errors and toast feedback
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Store projects globally in this module for modal access
  let loadedProjects = [];

  // =========================================================================
  // 10. HELPER FUNCTIONS
  // =========================================================================

  /**
   * Escape HTML to prevent XSS injection in dynamic markup
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
   * Get Font Awesome icon class for a given skill name
   * @param {string} skillName 
   * @returns {string} Font Awesome class string
   */
  function getSkillIcon(skillName) {
    if (!skillName) return 'fas fa-code';
    const iconMap = {
      'C': 'fas fa-copyright',
      'C++': 'fas fa-code',
      'Python': 'fab fa-python',
      'JavaScript': 'fab fa-js',
      'HTML': 'fab fa-html5',
      'CSS': 'fab fa-css3-alt',
      'Git': 'fab fa-git-alt',
      'GitHub': 'fab fa-github',
      'VS Code': 'fas fa-code',
      'Arduino IDE': 'fas fa-microchip'
    };
    return iconMap[skillName] || 'fas fa-code';
  }

  /**
   * Truncate text to a maximum length with ellipsis
   * @param {string} text 
   * @param {number} maxLen 
   * @returns {string}
   */
  function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length > maxLen) {
      return text.slice(0, maxLen) + '...';
    }
    return text;
  }

  /**
   * Format date string using Intl.DateTimeFormat
   * @param {string} dateStr 
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Extract initials from a title for gradient placeholder
   * @param {string} title 
   * @returns {string}
   */
  function getInitials(title) {
    if (!title) return 'PR';
    const words = title.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  }

  /**
   * Display a floating toast notification
   * @param {string} message 
   * @param {string} type 'success' | 'error' | 'warning' | 'info'
   */
  function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} ${type}`;

    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

    toast.innerHTML = `
      <div class="toast-icon"><i class="${iconClass}"></i></div>
      <div class="toast-message">${escapeHTML(message)}</div>
      <button type="button" class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    function removeToast() {
      toast.classList.add('fade-out');
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

  // Expose showToast globally
  window.showToast = showToast;

  // =========================================================================
  // 1. THEME TOGGLE
  // =========================================================================

  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';

  /**
   * Apply theme to body and update toggle icon
   * @param {'light'|'dark'} theme 
   */
  function applyTheme(theme) {
    const isLight = theme === 'light';
    if (isLight) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }

    if (themeToggleBtn) {
      const icon = themeToggleBtn.querySelector('i') || themeToggleBtn;
      if (icon) {
        if (isLight) {
          icon.classList.remove('fa-moon');
          icon.classList.add('fa-sun');
        } else {
          icon.classList.remove('fa-sun');
          icon.classList.add('fa-moon');
        }
      }
    }
  }

  // Initialize theme on load
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isCurrentlyLight = document.body.classList.contains('light-theme');
      const nextTheme = isCurrentlyLight ? 'dark' : 'light';
      applyTheme(nextTheme);
      localStorage.setItem('theme', nextTheme);
    });
  }

  // =========================================================================
  // 2. MOBILE NAVIGATION
  // =========================================================================

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      const isActive = mobileMenu.classList.contains('active');
      mobileMenuBtn.setAttribute('aria-expanded', isActive);
    });

    // Close mobile menu when any nav link inside it is clicked
    const mobileNavLinks = mobileMenu.querySelectorAll('a');
    mobileNavLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // =========================================================================
  // 3. SCROLL ANIMATIONS
  // =========================================================================

  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    const scrollAnimationObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    animatedElements.forEach((el) => scrollAnimationObserver.observe(el));
  } else {
    // Fallback if IntersectionObserver is unsupported or no animated elements initially
    animatedElements.forEach((el) => el.classList.add('animated'));
  }

  // =========================================================================
  // 4. ACTIVE NAV LINK
  // =========================================================================

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"], #mobile-menu a[href^="#"], .nav-link[href^="#"]');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href === `#${currentId}`) {
              link.classList.add('active');
            } else if (href && href.startsWith('#')) {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      threshold: 0.25,
      rootMargin: '-70px 0px -25% 0px'
    });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  // =========================================================================
  // 5. BACK TO TOP & 6. NAVBAR SCROLL EFFECT
  // =========================================================================

  const backToTopBtn = document.getElementById('back-to-top');
  const navbarElement = document.querySelector('nav') || document.getElementById('navbar') || document.querySelector('.navbar');

  function handleWindowScroll() {
    const scrollY = window.scrollY || window.pageYOffset;

    // 5. Back to Top visibility
    if (backToTopBtn) {
      if (scrollY > 500) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }

    // 6. Navbar elevation class
    if (navbarElement) {
      if (scrollY > 50) {
        navbarElement.classList.add('scrolled');
      } else {
        navbarElement.classList.remove('scrolled');
      }
    }
  }

  window.addEventListener('scroll', handleWindowScroll, { passive: true });
  handleWindowScroll(); // Initial invocation

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // =========================================================================
  // 8. PROJECT MODAL
  // =========================================================================

  const projectModal = document.getElementById('project-modal');
  const modalCloseBtn = document.getElementById('modal-close') || projectModal?.querySelector('.modal-close, .close-modal, .close-btn');
  const modalImage = document.getElementById('modal-image') || projectModal?.querySelector('.modal-image, img');
  const modalTitle = document.getElementById('modal-title') || projectModal?.querySelector('.modal-title');
  const modalDescription = document.getElementById('modal-description') || projectModal?.querySelector('.modal-description, .modal-desc');
  const modalTechnologies = document.getElementById('modal-technologies') || projectModal?.querySelector('.modal-technologies, .modal-tech');
  const modalFeatures = document.getElementById('modal-features') || projectModal?.querySelector('.modal-features');
  const modalGithub = document.getElementById('modal-github') || document.getElementById('modal-github-link') || projectModal?.querySelector('.modal-github');
  const modalDemo = document.getElementById('modal-demo') || document.getElementById('modal-demo-link') || projectModal?.querySelector('.modal-demo');

  /**
   * Open and populate project details modal
   * @param {Object} project 
   */
  function openProjectModal(project) {
    if (!projectModal) return;

    // Set modal image — modalImage may be a <div> (modal-image-area) or an <img>
    if (modalImage) {
      if (project.image && project.image.trim()) {
        if (modalImage.tagName === 'IMG') {
          modalImage.src = project.image;
          modalImage.alt = project.title || 'Project Image';
          modalImage.style.display = '';
        } else {
          modalImage.innerHTML = `<img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title || 'Project Image')}" />`;
          modalImage.style.display = '';
        }
      } else {
        if (modalImage.tagName === 'IMG') {
          modalImage.src = '';
        } else {
          modalImage.innerHTML = '';
        }
        modalImage.style.display = 'none';
      }
    }

    // Set title
    if (modalTitle) {
      modalTitle.textContent = project.title || 'Project Details';
    }

    // Set full description
    if (modalDescription) {
      modalDescription.textContent = project.description || '';
    }

    // Set all technologies as tags
    if (modalTechnologies) {
      const techList = (project.technologies || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      modalTechnologies.innerHTML = techList
        .map((tech) => `<span class="tech-tag">${escapeHTML(tech)}</span>`)
        .join('');
    }

    // Set all features as a list
    if (modalFeatures) {
      const featureList = (project.features || '')
        .split(/[\r\n,]+/)
        .map((f) => f.trim())
        .filter(Boolean);

      modalFeatures.innerHTML = featureList
        .map((feature) => `<li><i class="fas fa-check-circle"></i> <span>${escapeHTML(feature)}</span></li>`)
        .join('');
    }

    // Show/hide GitHub button
    if (modalGithub) {
      if (project.github_url) {
        modalGithub.href = project.github_url;
        modalGithub.style.display = '';
      } else {
        modalGithub.style.display = 'none';
      }
    }

    // Show/hide Demo button
    if (modalDemo) {
      if (project.demo_url) {
        modalDemo.href = project.demo_url;
        modalDemo.style.display = '';
      } else {
        modalDemo.style.display = 'none';
      }
    }

    // Open modal
    projectModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the project modal
   */
  function closeProjectModal() {
    if (!projectModal) return;
    projectModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Close modal on close button click
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeProjectModal);
  }

  // Close modal when clicking overlay background
  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal || e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-backdrop')) {
        closeProjectModal();
      }
    });
  }

  // Close modal on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && projectModal && projectModal.classList.contains('active')) {
      closeProjectModal();
    }
  });

  // Expose globally so inline onclick or external callers can invoke it
  window.openProjectModal = openProjectModal;
  window.closeProjectModal = closeProjectModal;

  // =========================================================================
  // 7. DATA LOADING AND RENDERING
  // =========================================================================

  /**
   * Render Hero and Profile Information
   * @param {Object} profile 
   */
  function renderProfile(profile) {
    if (!profile) return;

    // Hero elements
    const heroName = document.getElementById('hero-name');
    if (heroName) heroName.textContent = profile.name || '[Your Name]';

    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = profile.title || '';

    const heroSubtitle = document.getElementById('hero-subtitle');
    if (heroSubtitle) heroSubtitle.textContent = profile.subtitle || '';

    const heroIntro = document.getElementById('hero-intro');
    if (heroIntro) heroIntro.textContent = profile.intro || '';

    const heroImage = document.getElementById('hero-image');
    if (heroImage) {
      if (profile.profile_image && profile.profile_image.trim()) {
        heroImage.src = profile.profile_image;
        heroImage.style.display = '';
        // Show the wrapper too
        const wrapper = heroImage.closest('.hero-image-wrapper');
        if (wrapper) wrapper.style.display = '';
      } else {
        heroImage.style.display = 'none';
        // Hide the wrapper to avoid an empty circle frame
        const wrapper = heroImage.closest('.hero-image-wrapper');
        if (wrapper) wrapper.style.display = 'none';
      }
    }

    // Social links
    const socialGithub = document.getElementById('social-github');
    if (socialGithub) {
      if (profile.github_url) {
        socialGithub.href = profile.github_url;
        socialGithub.style.display = '';
      } else {
        socialGithub.style.display = 'none';
      }
    }

    const socialLinkedin = document.getElementById('social-linkedin');
    if (socialLinkedin) {
      if (profile.linkedin_url) {
        socialLinkedin.href = profile.linkedin_url;
        socialLinkedin.style.display = '';
      } else {
        socialLinkedin.style.display = 'none';
      }
    }

    const socialEmail = document.getElementById('social-email');
    if (socialEmail) {
      if (profile.email) {
        socialEmail.href = `mailto:${profile.email}`;
        socialEmail.style.display = '';
      } else {
        socialEmail.style.display = 'none';
      }
    }

    // Navbar Brand / Name
    const navName = document.getElementById('nav-name');
    if (navName) navName.textContent = profile.name || '[Your Name]';

    // Download Resume Hero Button
    const downloadResumeBtn = document.getElementById('download-resume-btn');
    if (downloadResumeBtn) {
      if (profile.resume_path) {
        downloadResumeBtn.href = '/api/resume/download';
        downloadResumeBtn.style.display = '';
      } else {
        downloadResumeBtn.style.display = 'none';
      }
    }

    // Footer social links — update from profile data
    const footerLinks = document.querySelectorAll('.footer-social-links a, .footer-social-link');
    footerLinks.forEach((link) => {
      const icon = link.querySelector('i');
      if (!icon) return;
      if (icon.classList.contains('fa-github') && profile.github_url) {
        link.href = profile.github_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else if (icon.classList.contains('fa-linkedin') && profile.linkedin_url) {
        link.href = profile.linkedin_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else if (icon.classList.contains('fa-envelope') && profile.email) {
        link.href = `mailto:${profile.email}`;
      }
    });

    // Contact Info section
    renderContactInfo(profile);
  }

  /**
   * Render Contact Info sidebar from profile data
   * @param {Object} profile
   */
  function renderContactInfo(profile) {
    const contactInfo = document.getElementById('contact-info');
    if (!contactInfo) return;

    let html = '';

    if (profile?.email) {
      html += `
        <div class="contact-info-item">
          <div class="contact-icon">
            <i class="fas fa-envelope"></i>
          </div>
          <div class="contact-info-text">
            <h4>Email</h4>
            <a href="mailto:${escapeHTML(profile.email)}">${escapeHTML(profile.email)}</a>
          </div>
        </div>
      `;
    }

    if (profile?.github_url) {
      html += `
        <div class="contact-info-item">
          <div class="contact-icon">
            <i class="fab fa-github"></i>
          </div>
          <div class="contact-info-text">
            <h4>GitHub</h4>
            <a href="${escapeHTML(profile.github_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(profile.github_url)}</a>
          </div>
        </div>
      `;
    }

    if (profile?.linkedin_url) {
      html += `
        <div class="contact-info-item">
          <div class="contact-icon">
            <i class="fab fa-linkedin"></i>
          </div>
          <div class="contact-info-text">
            <h4>LinkedIn</h4>
            <a href="${escapeHTML(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(profile.linkedin_url)}</a>
          </div>
        </div>
      `;
    }

    if (!html.trim()) {
      html = `
        <div class="contact-info-item">
          <div class="contact-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="contact-info-text">
            <h4>Contact</h4>
            <p>Contact details will be added soon.</p>
          </div>
        </div>
      `;
    }

    contactInfo.innerHTML = html;
  }

  /**
   * Render About Section
   * @param {Object} profile 
   */
  function renderAbout(profile) {
    const aboutContent = document.getElementById('about-content');
    if (aboutContent) {
      let html = '';

      if (profile?.about_text) {
        html += `<p class="about-lead">${escapeHTML(profile.about_text)}</p>`;
      }
      if (profile?.about_academic) {
        html += `
          <div class="about-block">
            <h4><i class="fas fa-graduation-cap"></i> Academic Background</h4>
            <p>${escapeHTML(profile.about_academic)}</p>
          </div>
        `;
      }
      if (profile?.about_interests) {
        html += `
          <div class="about-block">
            <h4><i class="fas fa-lightbulb"></i> Areas of Interest</h4>
            <p>${escapeHTML(profile.about_interests)}</p>
          </div>
        `;
      }
      if (profile?.about_goals) {
        html += `
          <div class="about-block">
            <h4><i class="fas fa-bullseye"></i> Professional Goals</h4>
            <p>${escapeHTML(profile.about_goals)}</p>
          </div>
        `;
      }

      if (!html.trim()) {
        html = '<p class="about-empty">About section coming soon.</p>';
      }

      aboutContent.innerHTML = html;
    }

    // Render About Areas tags
    const aboutAreas = document.getElementById('about-areas');
    if (aboutAreas) {
      if (profile?.about_areas) {
        const areas = profile.about_areas
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);

        aboutAreas.innerHTML = areas
          .map((area) => `<span class="area-tag">${escapeHTML(area)}</span>`)
          .join('');
      } else {
        aboutAreas.innerHTML = '';
      }
    }
  }

  /**
   * Render Skills Section
   * @param {Object} skillsData Category-grouped skills object
   */
  function renderSkills(skillsData) {
    const skillsContainer = document.getElementById('skills-container');
    if (!skillsContainer) return;

    const categories = Object.keys(skillsData || {});
    if (categories.length === 0) {
      skillsContainer.innerHTML = '<p class="empty-state">No skills listed yet.</p>';
      return;
    }

    let html = '';
    categories.forEach((category) => {
      const skills = skillsData[category] || [];
      const chipsHtml = skills.map((skill) => {
        const iconClass = skill.icon || getSkillIcon(skill.name);
        return `
          <div class="skill-chip">
            <i class="${escapeHTML(iconClass)}"></i>
            <span>${escapeHTML(skill.name)}</span>
          </div>
        `;
      }).join('');

      html += `
        <div class="skill-category-card">
          <h3 class="skill-category-title">${escapeHTML(category)}</h3>
          <div class="skill-chips">
            ${chipsHtml}
          </div>
        </div>
      `;
    });

    skillsContainer.innerHTML = html;
  }

  /**
   * Render Projects Section
   * @param {Array} projects 
   */
  function renderProjects(projects) {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) return;

    loadedProjects = Array.isArray(projects) ? projects : [];

    if (loadedProjects.length === 0) {
      projectsContainer.innerHTML = '<p class="empty-state">No projects found.</p>';
      return;
    }

    let html = '';
    loadedProjects.forEach((project) => {
      // Image or initials placeholder
      const imageHtml = project.image && project.image.trim()
        ? `<div class="project-img-wrapper"><img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title)}" class="project-img" loading="lazy" /></div>`
        : `<div class="project-img-placeholder"><span class="project-initials">${escapeHTML(getInitials(project.title))}</span></div>`;

      // Truncated description
      const truncatedDesc = truncateText(project.description || '', 150);

      // Technology tags
      const techTags = (project.technologies || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => `<span class="tech-tag">${escapeHTML(t)}</span>`)
        .join('');

      // Features list (first 3)
      const features = (project.features || '')
        .split(/[\r\n,]+/)
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 3)
        .map((f) => `<li><i class="fas fa-check"></i> ${escapeHTML(f)}</li>`)
        .join('');

      // Action buttons
      let actionsHtml = '';
      if (project.github_url) {
        actionsHtml += `
          <a href="${escapeHTML(project.github_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
            <i class="fab fa-github"></i> Code
          </a>
        `;
      }
      if (project.demo_url) {
        actionsHtml += `
          <a href="${escapeHTML(project.demo_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary">
            <i class="fas fa-external-link-alt"></i> Demo
          </a>
        `;
      }
      actionsHtml += `
        <button type="button" class="btn btn-sm btn-secondary view-details-btn" data-project-id="${project.id}">
          <i class="fas fa-info-circle"></i> View Details
        </button>
      `;

      html += `
        <div class="project-card animate-on-scroll">
          ${imageHtml}
          <div class="project-card-content">
            <h3 class="project-title">${escapeHTML(project.title)}</h3>
            <p class="project-description">${escapeHTML(truncatedDesc)}</p>
            ${techTags ? `<div class="project-tech-tags">${techTags}</div>` : ''}
            ${features ? `<ul class="project-features-list">${features}</ul>` : ''}
            <div class="project-actions">
              ${actionsHtml}
            </div>
          </div>
        </div>
      `;
    });

    projectsContainer.innerHTML = html;

    // Attach click handler for "View Details" buttons via event delegation
    projectsContainer.addEventListener('click', (e) => {
      const button = e.target.closest('.view-details-btn');
      if (button) {
        const projectId = button.getAttribute('data-project-id');
        const project = loadedProjects.find((p) => String(p.id) === String(projectId));
        if (project) {
          openProjectModal(project);
        }
      }
    });
  }

  /**
   * Render Education Section Timeline
   * @param {Array} education 
   */
  function renderEducation(education) {
    const educationTimeline = document.getElementById('education-timeline');
    if (!educationTimeline) return;

    if (!Array.isArray(education) || education.length === 0) {
      educationTimeline.innerHTML = '<p class="empty-state">No education records available.</p>';
      return;
    }

    let html = '';
    education.forEach((item) => {
      const degreeBranch = [item.degree, item.branch].filter(Boolean).join(' - ');

      html += `
        <div class="timeline-item animate-on-scroll">
          <div class="timeline-badge">
            <span class="timeline-year">${escapeHTML(item.academic_year || '')}</span>
          </div>
          <div class="timeline-content">
            <h3 class="timeline-college">${escapeHTML(item.college || '')}</h3>
            ${degreeBranch ? `<h4 class="timeline-degree">${escapeHTML(degreeBranch)}</h4>` : ''}
            ${item.university ? `<p class="timeline-university"><i class="fas fa-university"></i> ${escapeHTML(item.university)}</p>` : ''}
            ${item.semester ? `<p class="timeline-semester"><i class="fas fa-book-reader"></i> ${escapeHTML(item.semester)}</p>` : ''}
            ${item.achievements ? `<p class="timeline-achievements">${escapeHTML(item.achievements)}</p>` : ''}
          </div>
        </div>
      `;
    });

    educationTimeline.innerHTML = html;
  }

  /**
   * Render Certificates Section
   * @param {Array} certificates 
   */
  function renderCertificates(certificates) {
    const certsContainer = document.getElementById('certificates-container');
    if (!certsContainer) return;

    if (!Array.isArray(certificates) || certificates.length === 0) {
      certsContainer.innerHTML = '<p class="empty-state">No certificates uploaded yet.</p>';
      return;
    }

    let html = '';
    certificates.forEach((cert) => {
      const formattedDate = formatDate(cert.issue_date);
      const certLink = cert.cert_url || cert.image;

      const certImgHtml = cert.image && cert.image.trim()
        ? `<div class="cert-img-wrapper"><img src="${escapeHTML(cert.image)}" alt="${escapeHTML(cert.title)}" class="cert-img" loading="lazy" /></div>`
        : `<div class="cert-img-placeholder"><i class="fas fa-award"></i></div>`;

      html += `
        <div class="certificate-card animate-on-scroll">
          ${certImgHtml}
          <div class="cert-card-content">
            <h3 class="cert-title">${escapeHTML(cert.title)}</h3>
            <h4 class="cert-org">${escapeHTML(cert.organization)}</h4>
            ${formattedDate ? `<span class="cert-date"><i class="far fa-calendar-alt"></i> ${escapeHTML(formattedDate)}</span>` : ''}
            ${cert.description ? `<p class="cert-description">${escapeHTML(cert.description)}</p>` : ''}
            ${certLink ? `
              <div class="cert-actions">
                <a href="${escapeHTML(certLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
                  <i class="fas fa-external-link-alt"></i> View Certificate
                </a>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    certsContainer.innerHTML = html;
  }

  /**
   * Render Resume Section
   * @param {Object} profile 
   */
  function renderResume(profile) {
    const resumeContent = document.getElementById('resume-content');
    if (!resumeContent) return;

    if (profile && profile.resume_path && profile.resume_path.trim()) {
      resumeContent.innerHTML = `
        <div class="resume-wrapper">
          <div class="resume-actions">
            <a href="/api/resume/download" class="btn btn-primary" download>
              <i class="fas fa-download"></i> Download Resume
            </a>
          </div>
          <div class="resume-preview-container">
            <iframe src="${escapeHTML(profile.resume_path)}" title="Resume Preview" class="resume-iframe"></iframe>
          </div>
        </div>
      `;
    } else {
      resumeContent.innerHTML = '<p class="resume-empty">No resume uploaded yet. Check back soon!</p>';
    }
  }

  /**
   * Fetch all portfolio data in parallel and trigger rendering
   */
  async function loadPortfolioData() {
    try {
      const [profileRes, skillsRes, projectsRes, educationRes, certsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/skills'),
        fetch('/api/projects'),
        fetch('/api/education'),
        fetch('/api/certificates')
      ]);

      if (!profileRes.ok || !skillsRes.ok || !projectsRes.ok || !educationRes.ok || !certsRes.ok) {
        throw new Error('Failed to load portfolio endpoints.');
      }

      const [profile, skills, projects, education, certificates] = await Promise.all([
        profileRes.json(),
        skillsRes.json(),
        projectsRes.json(),
        educationRes.json(),
        certsRes.json()
      ]);

      // Render each section
      renderProfile(profile);
      renderAbout(profile);
      renderSkills(skills);
      renderProjects(projects);
      renderEducation(education);
      renderCertificates(certificates);
      renderResume(profile);

      // Re-observe any dynamically added elements with .animate-on-scroll
      const dynamicAnimElements = document.querySelectorAll('.animate-on-scroll:not(.animated)');
      if ('IntersectionObserver' in window && dynamicAnimElements.length > 0) {
        const dynamicObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animated');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });

        dynamicAnimElements.forEach((el) => dynamicObserver.observe(el));
      }

    } catch (error) {
      console.error('Error loading portfolio data:', error);
      showToast('Failed to load portfolio content. Please try again.', 'error');
    }
  }

  // Load portfolio data on DOMContentLoaded
  loadPortfolioData();

  // =========================================================================
  // 9. CONTACT FORM
  // =========================================================================

  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    /**
     * Set inline error on an input/textarea element
     * @param {HTMLElement} inputEl 
     * @param {string} errorMsg 
     */
    function setFieldError(inputEl, errorMsg) {
      if (!inputEl) return;
      inputEl.classList.add('error');

      // Check for adjacent or parent .form-error span
      let errorSpan = inputEl.parentElement?.querySelector('.form-error');
      if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'form-error';
        inputEl.insertAdjacentElement('afterend', errorSpan);
      }
      errorSpan.textContent = errorMsg;
      errorSpan.style.display = 'block';
    }

    /**
     * Clear inline error on an input/textarea element
     * @param {HTMLElement} inputEl 
     */
    function clearFieldError(inputEl) {
      if (!inputEl) return;
      inputEl.classList.remove('error');

      const errorSpan = inputEl.parentElement?.querySelector('.form-error');
      if (errorSpan) {
        errorSpan.textContent = '';
        errorSpan.style.display = 'none';
      }
    }

    // Attach input event listeners to clear errors on input
    const formFields = contactForm.querySelectorAll('input, textarea');
    formFields.forEach((field) => {
      field.addEventListener('input', () => clearFieldError(field));
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = contactForm.querySelector('[name="name"]') || document.getElementById('name') || document.getElementById('contact-name');
      const emailInput = contactForm.querySelector('[name="email"]') || document.getElementById('email') || document.getElementById('contact-email');
      const subjectInput = contactForm.querySelector('[name="subject"]') || document.getElementById('subject') || document.getElementById('contact-subject');
      const messageInput = contactForm.querySelector('[name="message"]') || document.getElementById('message') || document.getElementById('contact-message');

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const subjectVal = subjectInput ? subjectInput.value.trim() : '';
      const messageVal = messageInput ? messageInput.value.trim() : '';

      let isValid = true;

      // Validate Name
      if (!nameVal) {
        setFieldError(nameInput, 'Name is required');
        isValid = false;
      } else {
        clearFieldError(nameInput);
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal) {
        setFieldError(emailInput, 'Email is required');
        isValid = false;
      } else if (!emailRegex.test(emailVal)) {
        setFieldError(emailInput, 'Please provide a valid email address');
        isValid = false;
      } else {
        clearFieldError(emailInput);
      }

      // Validate Subject
      if (!subjectVal) {
        setFieldError(subjectInput, 'Subject is required');
        isValid = false;
      } else {
        clearFieldError(subjectInput);
      }

      // Validate Message
      if (!messageVal) {
        setFieldError(messageInput, 'Message is required');
        isValid = false;
      } else {
        clearFieldError(messageInput);
      }

      if (!isValid) {
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: nameVal,
            email: emailVal,
            subject: subjectVal,
            message: messageVal
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showToast('Message sent successfully!', 'success');
          contactForm.reset();
          [nameInput, emailInput, subjectInput, messageInput].forEach(clearFieldError);
        } else {
          showToast(data.error || 'Failed to send message. Please try again.', 'error');
        }
      } catch (err) {
        console.error('Contact form submission error:', err);
        showToast('Failed to send message. Please try again.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  // =========================================================================
  // 11. FOOTER
  // =========================================================================

  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }
});
