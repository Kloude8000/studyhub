document.addEventListener('DOMContentLoaded', () => {
  const esc = StudyHub.escapeHtml;
  const fetchWithAuth = StudyHub.fetchWithAuth;

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // ===== DOM refs =====
  const sidebar = document.getElementById('sidebar');
  const closeSidebarBtn = document.getElementById('closeSidebar');
  const menuToggle = document.getElementById('menuToggle');
  const contentArea = document.getElementById('sectionContent');
  const pageTitle = document.getElementById('pageTitle');
  const userNameEl = document.getElementById('userName');
  const userRoleEl = document.getElementById('userRole');
  const userAvatar = document.getElementById('userAvatar');
  const greeting = document.getElementById('greeting');
  const logoutBtn = document.getElementById('logoutBtn');

  // ===== Load user info =====
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {}

  function startApp() {
    if (!StudyHub.requireRole(['student'], user)) return;
    updateUserUI();
    StudyHub.initNotifications({
      openLink: (link) => {
        if (link === 'announcement:platform') {
          loadSection('overview');
          navLinks.forEach(l => l.classList.remove('active'));
          document.querySelector('[data-section="overview"]')?.classList.add('active');
          return;
        }
        if (link && link.startsWith('course:')) {
          const courseId = Number(link.slice(7));
          if (courseId) openCourse(courseId);
        }
      }
    });
    loadSection('overview');
  }

  if (!user) {
    fetchWithAuth('/api/auth/profile')
      .then(res => res && res.json())
      .then(data => {
        if (data?.user) {
          user = data.user;
          localStorage.setItem('user', JSON.stringify(user));
          startApp();
        } else {
          throw new Error('No user data');
        }
      })
      .catch(() => {
        StudyHub.clearSession();
        window.location.href = 'login.html';
      });
  } else {
    startApp();
  }

  function updateUserUI() {
    if (!user) return;
    userNameEl.textContent = user.full_name || 'User';
    userRoleEl.textContent = user.role || 'student';
    const initials = (user.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    userAvatar.textContent = initials;
    greeting.textContent = `Welcome back, ${user.full_name || 'User'}!`;
  }

  // ===== Navigation =====
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      loadSection(section);
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sidebar.classList.remove('open');
    });
  });

  // ===== Load sections =====
  async function loadSection(section, params = null) {
    const titles = {
      overview: 'Dashboard',
      enrollments: 'My Enrollments',
      browse: 'Browse Courses',
      journal: 'Study Journal',
      progress: 'Progress',
      profile: 'Profile',
      'course-detail': 'Course Content'
    };
    pageTitle.textContent = titles[section] || 'Dashboard';

    contentArea.innerHTML = `<div class="text-center"><div class="loading-spinner"></div><p>Loading...</p></div>`;

    switch (section) {
      case 'overview': await loadOverview(); break;
      case 'enrollments': await loadEnrollments(); break;
      case 'browse': await loadBrowseCourses(); break;
      case 'journal': await loadJournal(); break;
      case 'progress': await loadProgress(); break;
      case 'profile': await loadProfile(); break;
      case 'course-detail': await loadCourseDetail(params); break;
      default: contentArea.innerHTML = '<p>Section not found.</p>';
    }
  }

  function openCourse(courseId) {
    loadSection('course-detail', courseId);
  }

  async function unenrollFromCourse(courseId, courseTitle, reloadSection) {
    const label = courseTitle || 'this course';
    if (!confirm(`Unenroll from "${label}"? Your progress and journal entries for this course will be removed.`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/enrollments/unenroll/${courseId}`, { method: 'DELETE' });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {}

      if (res && res.ok) {
        loadSection(reloadSection || 'enrollments');
        const navTarget = document.querySelector(`[data-section="${reloadSection || 'enrollments'}"]`);
        if (navTarget) {
          document.querySelectorAll('.sidebar-nav a[data-section]').forEach(l => l.classList.remove('active'));
          navTarget.classList.add('active');
        }
      } else {
        alert(data.message || 'Could not unenroll.');
      }
    } catch (error) {
      alert('Network error.');
    }
  }

  function bindUnenrollHandlers(container, reloadSection) {
    container.querySelectorAll('.unenroll-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        unenrollFromCourse(btn.dataset.courseId, btn.dataset.courseTitle, reloadSection);
      });
    });
  }

  // ===== OVERVIEW =====
  async function loadOverview() {
    try {
      console.log('Loading overview...');
      const [enrollRes, progressRes, announceRes] = await Promise.all([
        fetchWithAuth('/api/enrollments/my-enrollments'),
        fetchWithAuth('/api/progress/my-progress'),
        fetchWithAuth('/api/announcements/platform')
      ]);

      console.log('Enrollments response status:', enrollRes?.status);
      console.log('Progress response status:', progressRes?.status);

      let enrollments = [], progress = [], announcements = [];
      if (enrollRes && enrollRes.ok) {
        enrollments = await enrollRes.json();
        console.log('Enrollments data:', enrollments);
      } else {
        console.log('Enrollments fetch failed or not ok');
        if (enrollRes) {
          const errorText = await enrollRes.text();
          console.log('Error response body:', errorText);
        }
      }
      if (progressRes && progressRes.ok) {
        progress = await progressRes.json();
        console.log('Progress data:', progress);
      }
      if (announceRes && announceRes.ok) {
        announcements = await announceRes.json();
      }

      // ... the rest is the same
      const totalCourses = enrollments.length;
      const totalStudyTime = progress.reduce((sum, p) => sum + (p.total_study_time || 0), 0);
      const avgProgress = progress.length > 0
        ? progress.reduce((sum, p) => sum + parseFloat(p.completion_percentage || 0), 0) / progress.length
        : 0;

      const progressMap = {};
      progress.forEach(p => { progressMap[p.course_id] = p; });

      let html = `
        <div class="stats-grid">
          <div class="stat-card"><h3>Enrolled Courses</h3><div class="stat-value">${totalCourses}</div></div>
          <div class="stat-card"><h3>Total Study Time</h3><div class="stat-value">${Math.round(totalStudyTime)} min</div></div>
          <div class="stat-card"><h3>Average Progress</h3><div class="stat-value">${avgProgress.toFixed(1)}%</div></div>
        </div>
      `;

      if (enrollments.length === 0) {
        html += StudyHub.emptyStateHtml(
          'You are not enrolled in any courses yet.',
          { section: 'browse', label: 'Browse courses' }
        );
      } else {
        html += `<div class="course-list"><h3>Your Courses</h3>`;
        enrollments.forEach(course => {
          const prog = progressMap[course.course_id];
          const percent = prog ? parseFloat(prog.completion_percentage) : 0;
          html += `
            <div class="course-item clickable" data-course-id="${course.course_id}" role="button" tabindex="0">
              <div class="course-info">
                <h4>${esc(course.course_title)}</h4>
                <span class="course-code">${esc(course.course_code)}</span>
              </div>
              <div class="course-progress">
                <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%;"></div></div>
                <span class="progress-text">${percent.toFixed(0)}%</span>
              </div>
              <button type="button" class="unenroll-btn" data-course-id="${course.course_id}" data-course-title="${esc(course.course_title)}">Unenroll</button>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `<div style="margin-top:28px;"><h3>Platform announcements</h3>`;
      html += StudyHub.renderAnnouncementList(announcements, { user });
      html += `</div>`;

      contentArea.innerHTML = html;
      bindCourseOpenHandlers(contentArea);
      bindUnenrollHandlers(contentArea, 'overview');
      StudyHub.bindEmptyStateActions(contentArea);
    } catch (error) {
      console.error('Overview error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Failed to load overview. Check console for details.</p>`;
    }
  }

  // ===== MY ENROLLMENTS =====
  async function loadEnrollments() {
    try {
      const res = await fetchWithAuth('/api/enrollments/my-enrollments');
      console.log('Enrollments page response:', res?.status);
      if (!res || !res.ok) {
        if (res) {
          const text = await res.text();
          console.log('Error body:', text);
        }
        contentArea.innerHTML = `<p class="text-center">Could not load enrollments. Status: ${res?.status}</p>`;
        return;
      }
      const enrollments = await res.json();
      console.log('Enrollments list:', enrollments);

      const progressRes = await fetchWithAuth('/api/progress/my-progress');
      let progress = [];
      if (progressRes && progressRes.ok) progress = await progressRes.json();
      const progressMap = {};
      progress.forEach(p => { progressMap[p.course_id] = p; });

      if (enrollments.length === 0) {
        contentArea.innerHTML = StudyHub.emptyStateHtml(
          'You are not enrolled in any courses yet.',
          { section: 'browse', label: 'Browse courses' }
        );
        StudyHub.bindEmptyStateActions(contentArea);
        return;
      }

      let html = `<div class="enrollment-table"><table><thead><tr><th>Course Code</th><th>Course Title</th><th>Progress</th><th>Actions</th></tr></thead><tbody>`;
      enrollments.forEach(course => {
        const prog = progressMap[course.course_id];
        const percent = prog ? parseFloat(prog.completion_percentage) : 0;
        html += `
          <tr class="enrollment-row" data-course-id="${course.course_id}" role="button" tabindex="0">
            <td><strong>${esc(course.course_code)}</strong></td>
            <td>${esc(course.course_title)}</td>
            <td>
              <div class="progress-cell">
                <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%;"></div></div>
                <span>${percent.toFixed(0)}%</span>
              </div>
            </td>
            <td>
              <button type="button" class="unenroll-btn" data-course-id="${course.course_id}" data-course-title="${esc(course.course_title)}">Unenroll</button>
            </td>
          </tr>
        `;
      });
      html += `</tbody></table></div>`;
      contentArea.innerHTML = html;
      bindCourseOpenHandlers(contentArea);
      bindUnenrollHandlers(contentArea, 'enrollments');
    } catch (error) {
      console.error('Enrollments error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading enrollments.</p>`;
    }
  }

  // ===== BROWSE COURSES =====
  function filterCoursesBySearch(courses, query) {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(course => {
      const title = (course.course_title || '').toLowerCase();
      const code = (course.course_code || '').toLowerCase();
      const lecturer = (course.lecturer_name || '').toLowerCase();
      const description = (course.description || '').toLowerCase();
      return title.includes(q) || code.includes(q) || lecturer.includes(q) || description.includes(q);
    });
  }

  async function loadBrowseCourses() {
    try {
      const res = await fetch(`${StudyHub.API_BASE}/api/courses`);
      if (!res.ok) { contentArea.innerHTML = `<p class="text-center">Could not load courses.</p>`; return; }
      const courses = await res.json();
      const enrollRes = await fetchWithAuth('/api/enrollments/my-enrollments');
      let enrolledIds = new Set();
      if (enrollRes && enrollRes.ok) {
        const enrollments = await enrollRes.json();
        enrolledIds = new Set(enrollments.map(c => c.course_id));
      }

      contentArea.innerHTML = `
        <div class="course-search-bar">
          <i class="fas fa-search"></i>
          <input type="search" id="courseSearchInput" class="course-search-input" placeholder="Search by title, code, lecturer, or description..." autocomplete="off" />
        </div>
        <p id="courseSearchStatus" class="course-search-status" style="display:none;"></p>
        <div id="courseBrowseGrid"></div>
      `;

      function bindBrowseCourseActions() {
        document.querySelectorAll('.enroll-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const courseId = btn.dataset.courseId;
            btn.disabled = true;
            btn.textContent = 'Enrolling...';
            try {
              const enrollRes = await fetchWithAuth(`/api/enrollments/enroll/${courseId}`, { method: 'POST' });
              const data = await enrollRes.json();
              if (enrollRes.ok) {
                loadBrowseCourses();
              } else {
                alert(data.message || 'Enrollment failed.');
                btn.disabled = false;
                btn.textContent = 'Enroll';
              }
            } catch (error) {
              alert('Network error.');
              btn.disabled = false;
              btn.textContent = 'Enroll';
            }
          });
        });

        document.querySelectorAll('.open-course-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openCourse(btn.dataset.courseId);
          });
        });

        bindUnenrollHandlers(document.getElementById('courseBrowseGrid'), 'browse');
      }

      function renderBrowseCourses(list) {
        const grid = document.getElementById('courseBrowseGrid');
        const status = document.getElementById('courseSearchStatus');

        if (courses.length === 0) {
          grid.innerHTML = StudyHub.emptyStateHtml(
            'No courses are available yet. Ask a lecturer or administrator to create one.'
          );
          status.style.display = 'none';
          return;
        }

        if (list.length === 0) {
          grid.innerHTML = '';
          status.style.display = 'block';
          status.textContent = 'No courses match your search.';
          return;
        }

        const query = document.getElementById('courseSearchInput')?.value.trim() || '';
        if (query) {
          status.style.display = 'block';
          status.textContent = `Showing ${list.length} of ${courses.length} courses`;
        } else {
          status.style.display = 'none';
        }

        let html = `<div class="course-card-grid">`;
        list.forEach(course => {
          const isEnrolled = enrolledIds.has(course.course_id);
          html += `
            <div class="course-card" data-course-id="${course.course_id}">
              <h4>${esc(course.course_title)}</h4>
              <div class="course-code">${esc(course.course_code)}</div>
              ${course.lecturer_name ? `<div class="course-code">Lecturer: ${esc(course.lecturer_name)}</div>` : ''}
              <div class="description">${esc(course.description) || 'No description available.'}</div>
              <div class="course-actions">
                ${isEnrolled
                  ? `<span class="enrolled-badge">Enrolled</span>
                     <button class="open-course-btn" data-course-id="${course.course_id}">Open course</button>
                     <button type="button" class="unenroll-btn" data-course-id="${course.course_id}" data-course-title="${esc(course.course_title)}">Unenroll</button>`
                  : `<button class="enroll-btn" data-course-id="${course.course_id}">Enroll</button>`
                }
              </div>
            </div>
          `;
        });
        html += `</div>`;
        grid.innerHTML = html;
        bindBrowseCourseActions();
      }

      renderBrowseCourses(courses);

      document.getElementById('courseSearchInput').addEventListener('input', (e) => {
        renderBrowseCourses(filterCoursesBySearch(courses, e.target.value));
      });
    } catch (error) {
      console.error('Browse error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading courses.</p>`;
    }
  }

  function bindCourseOpenHandlers(container) {
    container.querySelectorAll('[data-course-id]').forEach(el => {
      if (el.classList.contains('enroll-btn') || el.classList.contains('open-course-btn') || el.classList.contains('unenroll-btn')) return;
      const courseId = el.dataset.courseId;
      const activate = () => openCourse(courseId);
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  // ===== COURSE DETAIL (student) =====
  async function loadCourseDetail(courseId) {
    if (!courseId) {
      contentArea.innerHTML = `<p class="text-center">Course not found.</p>`;
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/courses/${courseId}`);
      if (!res || !res.ok) {
        contentArea.innerHTML = `<p class="text-center">Could not load course.</p>`;
        return;
      }
      const course = await res.json();

      pageTitle.textContent = course.course_title;

      let html = `
        <div class="course-detail-header">
          <a class="back-link" id="backFromCourse"><i class="fas fa-arrow-left"></i> Back to enrollments</a>
        </div>
        <div class="course-detail-title">
          <h2>${esc(course.course_title)}</h2>
          <div class="meta">${esc(course.course_code)}${course.lecturer_name ? ` · ${esc(course.lecturer_name)}` : ''}</div>
        </div>
        <div class="tabs">
          <button class="tab-btn active" data-tab="details">Details</button>
          <button class="tab-btn" data-tab="resources">Resources</button>
          <button class="tab-btn" data-tab="announcements">Announcements</button>
        </div>
        <div id="tabContent">
          <div class="tab-content active" id="tab-details">
            <div class="course-detail-panel">
              <p><strong>Course code</strong><br>${esc(course.course_code)}</p>
              <p><strong>Course title</strong><br>${esc(course.course_title)}</p>
              <p><strong>Description</strong><br>${esc(course.description) || 'No description provided.'}</p>
            </div>
          </div>
          <div class="tab-content" id="tab-resources">
            <div class="text-center"><div class="loading-spinner"></div><p>Loading resources...</p></div>
          </div>
          <div class="tab-content" id="tab-announcements">
            <div class="loading-spinner"></div>
          </div>
        </div>
      `;
      contentArea.innerHTML = html;

      document.getElementById('backFromCourse').addEventListener('click', (e) => {
        e.preventDefault();
        loadSection('enrollments');
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-section="enrollments"]')?.classList.add('active');
      });

      const tabBtns = document.querySelectorAll('.tab-btn');
      const tabContents = {
        details: document.getElementById('tab-details'),
        resources: document.getElementById('tab-resources'),
        announcements: document.getElementById('tab-announcements')
      };

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.tab;
          Object.values(tabContents).forEach(el => el.classList.remove('active'));
          tabContents[tab].classList.add('active');
          if (tab === 'resources' && tabContents.resources.querySelector('.loading-spinner')) {
            loadStudentResourcesTab(courseId);
          } else if (tab === 'announcements' && tabContents.announcements.querySelector('.loading-spinner')) {
            StudyHub.renderCourseAnnouncements(tabContents.announcements, courseId, { user });
          }
        });
      });

      loadStudentResourcesTab(courseId);
    } catch (error) {
      console.error('Course detail error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading course content.</p>`;
    }
  }

  async function loadStudentResourcesTab(courseId) {
    const container = document.getElementById('tab-resources');
    if (!container) return;

    try {
      const res = await fetchWithAuth(`/api/resources/course/${courseId}`);
      if (!res || !res.ok) {
        const data = res ? await res.json().catch(() => ({})) : {};
        container.innerHTML = `<p class="text-center">${data.message || 'Could not load resources.'}</p>`;
        return;
      }
      const resources = await res.json();

      if (resources.length === 0) {
        container.innerHTML = StudyHub.emptyStateHtml(
          'No resources have been uploaded for this course yet. Check back after your lecturer adds materials.'
        );
        return;
      }

      let html = `<div class="resource-list">`;
      resources.forEach(r => {
        html += `
          <div class="resource-item">
            <div>
              <span class="title">${esc(r.title)}</span>
              <span class="file-type">${r.file_type || 'file'}</span>
              ${r.viewed ? '<span class="file-type" style="background:#dcfce7;color:#166534;">Viewed</span>' : ''}
              ${r.downloaded ? '<span class="file-type" style="background:#dbeafe;color:#1d4ed8;">Downloaded</span>' : ''}
            </div>
            <div class="actions">
              <button type="button" class="view-btn" data-resource-id="${r.resource_id}">View</button>
              <button type="button" class="download-btn" data-resource-id="${r.resource_id}" data-filename="${esc(r.title)}">Download</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      container.innerHTML = html;
      StudyHub.bindResourceActions(container, {
        onSuccess: () => loadStudentResourcesTab(courseId)
      });
    } catch (error) {
      container.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading resources.</p>`;
    }
  }

  // ===== JOURNAL =====
  function formatLogDateForInput(logDate) {
    if (!logDate) return '';
    const str = String(logDate);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    const d = new Date(logDate);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  async function loadJournal() {
    try {
      const logsRes = await fetchWithAuth('/api/progress/logs');
      let logs = [];
      if (logsRes && logsRes.ok) logs = await logsRes.json();

      const enrollRes = await fetchWithAuth('/api/enrollments/my-enrollments');
      let courses = [];
      if (enrollRes && enrollRes.ok) courses = await enrollRes.json();

      let html = `
        <div style="margin-bottom: 24px;">
          <button id="toggleLogForm" class="btn-primary journal-add-btn">
            <i class="fas fa-plus"></i> Add Study Log
          </button>
        </div>
        <div id="logFormContainer" class="journal-form-container" style="display: none;">
          <h4 id="logFormTitle">Add Study Log</h4>
          <form id="logForm">
            <input type="hidden" id="editLogId" value="" />
            <div class="form-group" id="logCourseGroup">
              <label for="logCourse">Course</label>
              <select id="logCourse" required class="journal-input">
                <option value="">Select a course</option>
                ${courses.map(c => `<option value="${c.course_id}">${esc(c.course_code)} - ${esc(c.course_title)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="logCourseDisplay" style="display: none;">
              <label>Course</label>
              <p id="logCourseReadonly" class="journal-readonly-field"></p>
            </div>
            <div class="form-group">
              <label for="logTopic">Topic</label>
              <select id="logTopic" required class="journal-input">
                <option value="">Select a course first</option>
              </select>
            </div>
            <div class="form-group">
              <label for="logDuration">Study Duration (minutes)</label>
              <input type="number" id="logDuration" placeholder="e.g., 30" min="1" max="240" required class="journal-input" />
            </div>
            <div class="form-group">
              <label for="logNotes">Notes (optional)</label>
              <textarea id="logNotes" rows="3" placeholder="Any additional notes..." class="journal-input journal-textarea"></textarea>
            </div>
            <div class="form-group">
              <label for="logDate">Date</label>
              <input type="date" id="logDate" required class="journal-input" />
            </div>
            <div class="journal-form-actions">
              <button type="submit" id="logSubmitBtn" class="journal-submit-btn">Save Log</button>
              <button type="button" id="cancelLogForm" class="journal-cancel-btn">Cancel</button>
              <span id="logStatus" class="journal-status"></span>
            </div>
          </form>
        </div>
        <div id="logViewContainer" class="journal-view-container" hidden>
          <h4>Study log</h4>
          <div class="form-group">
            <label>Course</label>
            <p id="logViewCourse" class="journal-readonly-field"></p>
          </div>
          <div class="form-group">
            <label>Topic</label>
            <p id="logViewTopic" class="journal-readonly-field"></p>
          </div>
          <div class="form-group">
            <label>Date</label>
            <p id="logViewDate" class="journal-readonly-field"></p>
          </div>
          <div class="form-group">
            <label>Study duration</label>
            <p id="logViewDuration" class="journal-readonly-field"></p>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <p id="logViewNotes" class="journal-readonly-field journal-view-notes"></p>
          </div>
          <div class="journal-form-actions">
            <button type="button" id="logViewEditBtn" class="journal-submit-btn">Edit</button>
            <button type="button" id="logViewCloseBtn" class="journal-cancel-btn">Close</button>
          </div>
        </div>
        <h3>Your Study Logs</h3>
      `;

      if (logs.length === 0) {
        html += StudyHub.emptyStateHtml(
          'No study logs yet. Add a log above, or enrol in a course first if the topic list is empty.',
          { section: 'enrollments', label: 'Go to my courses' }
        );
      } else {
        html += `<div class="enrollment-table journal-table"><table><thead><tr><th>Date</th><th>Course</th><th>Topic</th><th>Duration</th><th>Notes</th><th>Actions</th></tr></thead><tbody>`;
        logs.forEach(log => {
          const notesPreview = log.notes
            ? (log.notes.length > 80 ? `${log.notes.slice(0, 80)}…` : log.notes)
            : '—';
          html += `
            <tr class="journal-log-row" data-log-id="${log.log_id}" role="button" tabindex="0">
              <td>${new Date(log.log_date).toLocaleDateString()}</td>
              <td>${esc(log.course_code)} - ${esc(log.course_title)}</td>
              <td>${esc(log.topic)}</td>
              <td>${log.study_duration} min</td>
              <td>${esc(notesPreview)}</td>
              <td class="journal-actions">
                <button type="button" class="journal-view-btn" data-log-id="${log.log_id}">View</button>
                <button type="button" class="journal-edit-btn" data-log-id="${log.log_id}">Edit</button>
                <button type="button" class="journal-delete-btn" data-log-id="${log.log_id}">Delete</button>
              </td>
            </tr>
          `;
        });
        html += `</tbody></table></div>`;
      }
      contentArea.innerHTML = html;

      StudyHub.bindEmptyStateActions(contentArea);

      const logFormContainer = document.getElementById('logFormContainer');
      const logViewContainer = document.getElementById('logViewContainer');
      const logForm = document.getElementById('logForm');
      const logFormTitle = document.getElementById('logFormTitle');
      const editLogIdInput = document.getElementById('editLogId');
      const logCourseGroup = document.getElementById('logCourseGroup');
      const logCourseSelect = document.getElementById('logCourse');
      const logCourseDisplay = document.getElementById('logCourseDisplay');
      const logCourseReadonly = document.getElementById('logCourseReadonly');
      const logSubmitBtn = document.getElementById('logSubmitBtn');
      const logStatus = document.getElementById('logStatus');
      const logTopicSelect = document.getElementById('logTopic');
      let viewingLogId = '';

      const logsById = {};
      logs.forEach(log => { logsById[log.log_id] = log; });
      const loggedTopicIds = new Set(logs.map(log => String(log.topic_id)));

      async function fillTopicOptions(courseId, selectedTopicId, allowSelected) {
        logTopicSelect.innerHTML = '<option value="">Loading topics...</option>';
        if (!courseId) {
          logTopicSelect.innerHTML = '<option value="">Select a course first</option>';
          return;
        }
        const topicsRes = await fetchWithAuth(`/api/courses/${courseId}/topics`);
        const topics = topicsRes && topicsRes.ok ? await topicsRes.json() : [];
        const available = topics.filter((t) => {
          const isSelected = allowSelected && String(t.topic_id) === String(selectedTopicId);
          return isSelected || !loggedTopicIds.has(String(t.topic_id));
        });
        if (topics.length === 0) {
          logTopicSelect.innerHTML = '<option value="">No topics defined for this course</option>';
          return;
        }
        if (available.length === 0) {
          logTopicSelect.innerHTML = '<option value="">All topics already logged</option>';
          return;
        }
        logTopicSelect.innerHTML = '<option value="">Select a topic</option>' + available.map(t =>
          `<option value="${t.topic_id}"${String(t.topic_id) === String(selectedTopicId) ? ' selected' : ''}>${esc(t.title)}</option>`
        ).join('');
      }

      function resetLogForm() {
        editLogIdInput.value = '';
        logForm.reset();
        logFormTitle.textContent = 'Add Study Log';
        logSubmitBtn.textContent = 'Save Log';
        logCourseGroup.style.display = '';
        logCourseDisplay.style.display = 'none';
        logCourseSelect.required = true;
        logTopicSelect.disabled = false;
        logTopicSelect.innerHTML = '<option value="">Select a course first</option>';
        logStatus.textContent = '';
        logStatus.className = 'journal-status';
      }

      function hideLogView() {
        logViewContainer.hidden = true;
        viewingLogId = '';
      }

      function openLogView(log) {
        hideLogForm();
        viewingLogId = String(log.log_id);
        document.getElementById('logViewCourse').textContent =
          `${log.course_code} - ${log.course_title}`;
        document.getElementById('logViewTopic').textContent = log.topic || '—';
        document.getElementById('logViewDate').textContent = new Date(log.log_date).toLocaleDateString();
        document.getElementById('logViewDuration').textContent = `${log.study_duration || 0} min`;
        document.getElementById('logViewNotes').textContent = log.notes || 'No notes for this log.';
        logViewContainer.hidden = false;
        logViewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function showLogForm() {
        hideLogView();
        logFormContainer.style.display = 'block';
      }

      function hideLogForm() {
        logFormContainer.style.display = 'none';
        resetLogForm();
      }

      function openAddLogForm() {
        resetLogForm();
        document.getElementById('logDate').value = new Date().toISOString().split('T')[0];
        showLogForm();
      }

      function openEditLogForm(log) {
        resetLogForm();
        editLogIdInput.value = log.log_id;
        logFormTitle.textContent = 'Edit Study Log';
        logSubmitBtn.textContent = 'Update Log';
        logCourseGroup.style.display = 'none';
        logCourseDisplay.style.display = '';
        logCourseReadonly.textContent = `${esc(log.course_code)} - ${esc(log.course_title)}`;
        logCourseSelect.required = false;
        logTopicSelect.innerHTML = `<option value="${log.topic_id}">${esc(log.topic)}</option>`;
        logTopicSelect.value = log.topic_id;
        logTopicSelect.disabled = true;
        document.getElementById('logDuration').value = log.study_duration || '';
        document.getElementById('logNotes').value = log.notes || '';
        document.getElementById('logDate').value = formatLogDateForInput(log.log_date);
        showLogForm();
        logFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      document.getElementById('toggleLogForm').addEventListener('click', openAddLogForm);
      document.getElementById('cancelLogForm').addEventListener('click', hideLogForm);
      document.getElementById('logViewCloseBtn').addEventListener('click', hideLogView);
      document.getElementById('logViewEditBtn').addEventListener('click', () => {
        const log = logsById[viewingLogId];
        if (log) openEditLogForm(log);
      });
      logCourseSelect.addEventListener('change', () => {
        fillTopicOptions(logCourseSelect.value, null, false);
      });

      document.querySelectorAll('.journal-log-row').forEach(row => {
        const open = () => {
          const log = logsById[row.dataset.logId];
          if (log) openLogView(log);
        };
        row.addEventListener('click', open);
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        });
      });

      document.querySelectorAll('.journal-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const log = logsById[btn.dataset.logId];
          if (log) openLogView(log);
        });
      });

      document.querySelectorAll('.journal-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const log = logsById[btn.dataset.logId];
          if (log) openEditLogForm(log);
        });
      });

      document.querySelectorAll('.journal-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const logId = btn.dataset.logId;
          const log = logsById[logId];
          if (!log) return;
          if (!confirm(`Delete the study log "${esc(log.topic)}"?`)) return;

          btn.disabled = true;
          try {
            const res = await fetchWithAuth(`/api/progress/log/${logId}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
              loadJournal();
            } else {
              alert(data.message || 'Failed to delete log.');
              btn.disabled = false;
            }
          } catch (error) {
            alert('Network error.');
            btn.disabled = false;
          }
        });
      });

      logForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editingLogId = editLogIdInput.value;
        const topicId = logTopicSelect.value;
        const duration = parseInt(document.getElementById('logDuration').value, 10);
        const notes = document.getElementById('logNotes').value.trim();
        const logDate = document.getElementById('logDate').value;

        if (!duration || !logDate || duration > 240) {
          logStatus.textContent = 'Please fill all required fields (duration 1–240 minutes).';
          logStatus.className = 'journal-status error';
          return;
        }

        logSubmitBtn.disabled = true;
        logStatus.textContent = editingLogId ? 'Updating...' : 'Saving...';
        logStatus.className = 'journal-status';

        try {
          let res;
          if (editingLogId) {
            res = await fetchWithAuth(`/api/progress/log/${editingLogId}`, {
              method: 'PUT',
              body: JSON.stringify({
                study_duration: duration,
                notes,
                log_date: logDate
              })
            });
          } else {
            const courseId = logCourseSelect.value;
            if (!courseId || !topicId) {
              logStatus.textContent = 'Please select a course and topic.';
              logStatus.className = 'journal-status error';
              logSubmitBtn.disabled = false;
              return;
            }
            res = await fetchWithAuth('/api/progress/log', {
              method: 'POST',
              body: JSON.stringify({
                course_id: parseInt(courseId, 10),
                topic_id: parseInt(topicId, 10),
                study_duration: duration,
                notes,
                log_date: logDate
              })
            });
          }

          const data = await res.json();
          if (res.ok) {
            logStatus.textContent = editingLogId ? 'Log updated successfully!' : 'Log added successfully!';
            logStatus.className = 'journal-status success';
            setTimeout(() => loadJournal(), 800);
          } else {
            const msg = data.message || (Array.isArray(data.errors) ? data.errors.join(' ') : 'Failed to save log.');
            logStatus.textContent = msg;
            logStatus.className = 'journal-status error';
            logSubmitBtn.disabled = false;
          }
        } catch (error) {
          logStatus.textContent = 'Network error.';
          logStatus.className = 'journal-status error';
          logSubmitBtn.disabled = false;
        }
      });

    } catch (error) {
      console.error('Journal error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading journal.</p>`;
    }
  }

  // ===== PROGRESS =====
  async function loadProgress() {
    try {
      const progressRes = await fetchWithAuth('/api/progress/my-progress');
      let progress = [];
      if (progressRes && progressRes.ok) progress = await progressRes.json();

      const enrollRes = await fetchWithAuth('/api/enrollments/my-enrollments');
      let enrollments = [];
      if (enrollRes && enrollRes.ok) enrollments = await enrollRes.json();

      const progressMap = {};
      progress.forEach(p => { progressMap[p.course_id] = p; });

      if (enrollments.length === 0) {
        contentArea.innerHTML = StudyHub.emptyStateHtml(
          'You are not enrolled in any courses yet. Enrol to start tracking topic completion.',
          { section: 'browse', label: 'Browse courses' }
        );
        StudyHub.bindEmptyStateActions(contentArea);
        return;
      }

      let html = `<div style="display: grid; grid-template-columns: 1fr; gap: 20px;">`;
      enrollments.forEach(course => {
        const prog = progressMap[course.course_id] || {};
        const percent = parseFloat(prog.completion_percentage) || 0;
        const totalTime = Math.round(prog.total_study_time || 0);
        const topicsDone = Number(prog.topics_completed) || 0;
        const topicsTotal = Number(prog.topics_total) || 0;
        const status = prog.completed_at ? 'Completed' : 'In progress';
        const lastActivity = prog.last_activity_at
          ? new Date(prog.last_activity_at).toLocaleString()
          : 'No activity yet';
        html += `
          <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
              <div>
                <h4 style="font-size: 18px; margin-bottom: 4px;">${esc(course.course_title)}</h4>
                <span style="color: #64748b; font-size: 14px;">${esc(course.course_code)}</span>
              </div>
              <span style="font-weight: 700; font-size: 20px; color: #1e293b;">${percent.toFixed(0)}%</span>
            </div>
            <div style="margin: 12px 0;">
              <div class="progress-bar" style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div class="progress-fill" style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
              </div>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 14px; color: #475569;">
              <span><strong>Topics:</strong> ${topicsDone} of ${topicsTotal}</span>
              <span><strong>Status:</strong> ${status}</span>
              <span><strong>Study time:</strong> ${totalTime} min</span>
              <span><strong>Viewed:</strong> ${Number(prog.resources_viewed) || 0}</span>
              <span><strong>Downloaded:</strong> ${Number(prog.resources_downloaded) || 0}</span>
              <span><strong>Last activity:</strong> ${esc(lastActivity)}</span>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      contentArea.innerHTML = html;
    } catch (error) {
      console.error('Progress error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading progress.</p>`;
    }
  }

  // ===== PROFILE =====
  async function loadProfile() {
    try {
      const res = await fetchWithAuth('/api/auth/profile');
      if (!res || !res.ok) { contentArea.innerHTML = `<p class="text-center">Could not load profile.</p>`; return; }
      const data = await res.json();
      const userData = data.user || user;

      let html = `
        <div class="profile-form">
          <form id="profileForm">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <input type="text" id="fullName" value="${esc(userData.full_name || '')}" required />
              <span class="error-message" id="fullNameError"></span>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" value="${esc(userData.email || '')}" required />
              <span class="error-message" id="emailError"></span>
            </div>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
            <p style="font-weight: 600; margin-bottom: 16px;">Change Password (optional)</p>
            <div class="form-group">
              <label for="currentPassword">Current Password</label>
              <input type="password" id="currentPassword" placeholder="Enter current password" />
            </div>
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input type="password" id="newPassword" placeholder="Min 6 characters" />
              <span class="error-message" id="newPasswordError"></span>
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" placeholder="Re-enter new password" />
              <span class="error-message" id="confirmPasswordError"></span>
            </div>
            <button type="submit" id="profileSubmit">Update Profile</button>
            <div id="profileStatus" class="form-status"></div>
          </form>
        </div>
      `;
      contentArea.innerHTML = html;

      const form = document.getElementById('profileForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const status = document.getElementById('profileStatus');
        const submitBtn = document.getElementById('profileSubmit');

        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));

        let errors = false;
        if (!fullName) { document.getElementById('fullNameError').textContent = 'Name is required.'; document.getElementById('fullName').classList.add('error'); errors = true; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { document.getElementById('emailError').textContent = 'Valid email is required.'; document.getElementById('email').classList.add('error'); errors = true; }
        if (newPassword && newPassword.length < 6) { document.getElementById('newPasswordError').textContent = 'Password must be at least 6 characters.'; document.getElementById('newPassword').classList.add('error'); errors = true; }
        if (newPassword && newPassword !== confirmPassword) { document.getElementById('confirmPasswordError').textContent = 'Passwords do not match.'; document.getElementById('confirmPassword').classList.add('error'); errors = true; }
        if (newPassword && !currentPassword) { document.getElementById('currentPassword').classList.add('error'); status.textContent = 'Current password is required to set a new password.'; status.className = 'form-status error'; errors = true; }
        if (errors) return;

        const payload = { full_name: fullName, email };
        if (currentPassword && newPassword) {
          payload.current_password = currentPassword;
          payload.new_password = newPassword;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        status.textContent = '';
        status.className = 'form-status';

        try {
          const res = await fetchWithAuth('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (res.ok) {
            status.textContent = 'Profile updated successfully!';
            status.className = 'form-status success';
            const updatedUser = { ...user, full_name: fullName, email };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            user = updatedUser;
            updateUserUI();
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
          } else {
            let msg = data.message || 'Update failed.';
            if (data.errors && Array.isArray(data.errors)) msg = data.errors.map(e => e.msg).join(' ');
            status.textContent = msg;
            status.className = 'form-status error';
          }
        } catch (error) {
          status.textContent = 'Network error.';
          status.className = 'form-status error';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Profile';
        }
      });

    } catch (error) {
      console.error('Profile error:', error);
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading profile.</p>`;
    }
  }

  // ===== Logout =====
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    StudyHub.clearSession();
    window.location.href = 'login.html';
  });

  // ===== Sidebar toggle =====
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992) {
      if (!sidebar.contains(e.target) && e.target !== menuToggle) {
        sidebar.classList.remove('open');
      }
    }
  });

});