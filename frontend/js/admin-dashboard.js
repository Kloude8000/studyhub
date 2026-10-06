document.addEventListener('DOMContentLoaded', () => {
  const esc = StudyHub.escapeHtml;
  const fetchWithAuth = StudyHub.fetchWithAuth;

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

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

  const courseModal = document.getElementById('courseModal');
  const courseForm = document.getElementById('courseForm');
  const editCourseId = document.getElementById('editCourseId');
  const courseCode = document.getElementById('courseCode');
  const courseTitle = document.getElementById('courseTitle');
  const courseDescription = document.getElementById('courseDescription');
  const courseLecturer = document.getElementById('courseLecturer');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalStatus = document.getElementById('modalStatus');

  const lecturerModal = document.getElementById('lecturerModal');
  const lecturerForm = document.getElementById('lecturerForm');
  const lecturerCancelBtn = document.getElementById('lecturerCancelBtn');
  const lecturerStatus = document.getElementById('lecturerStatus');

  let user = null;

  function bootDashboard() {
    if (!StudyHub.requireRole(['admin'], user)) return;
    updateUserUI();
    StudyHub.initNotifications({
      openLink: (link) => {
        if (link === 'announcement:platform') {
          loadSection('announcements');
          navLinks.forEach(l => l.classList.remove('active'));
          document.querySelector('[data-section="announcements"]')?.classList.add('active');
          return;
        }
        if (link && link.startsWith('course:')) {
          const courseId = Number(link.slice(7));
          if (courseId) loadSection('course-detail', courseId);
        }
      }
    });
    loadSection('dashboard');
  }

  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {}

  if (!user) {
    fetchWithAuth('/api/auth/profile')
      .then(res => res && res.json())
      .then(data => {
        if (data?.user) {
          user = data.user;
          localStorage.setItem('user', JSON.stringify(user));
          bootDashboard();
        } else {
          throw new Error('No user');
        }
      })
      .catch(() => {
        StudyHub.clearSession();
        window.location.href = 'login.html';
      });
  } else {
    bootDashboard();
  }

  function updateUserUI() {
    if (!user) return;
    userNameEl.textContent = user.full_name || 'Admin';
    userRoleEl.textContent = user.role || 'admin';
    const initials = (user.full_name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    userAvatar.textContent = initials;
    greeting.textContent = `Welcome back, ${user.full_name || 'Admin'}!`;
  }

  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      loadSection(link.dataset.section);
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      sidebar.classList.remove('open');
    });
  });

  async function loadSection(section, params = null) {
    if (!StudyHub.requireRole(['admin'], user)) return;

    const titles = {
      dashboard: 'Dashboard',
      users: 'Users',
      courses: 'All Courses',
      reports: 'Reports',
      announcements: 'Announcements',
      profile: 'Profile',
      'course-detail': 'Course Details'
    };
    pageTitle.textContent = titles[section] || 'Dashboard';
    contentArea.innerHTML = `<div class="text-center"><div class="loading-spinner"></div><p>Loading...</p></div>`;

    switch (section) {
      case 'dashboard': await loadDashboard(); break;
      case 'users': await loadUsers(); break;
      case 'courses': await loadCourses(); break;
      case 'reports': await loadReports(); break;
      case 'announcements': await loadAnnouncements(); break;
      case 'profile': await loadProfile(); break;
      case 'course-detail': await loadCourseDetail(params); break;
      default: contentArea.innerHTML = '<p class="text-center">Section not found.</p>';
    }
  }

  async function loadDashboard() {
    try {
      const res = await fetchWithAuth('/api/auth/admin/stats');
      if (!res || !res.ok) {
        contentArea.innerHTML = `<p class="text-center">Could not load dashboard stats.</p>`;
        return;
      }
      const stats = await res.json();

      contentArea.innerHTML = `
        <div class="stats-grid four-col">
          <div class="stat-card"><h3>Total Users</h3><div class="stat-value">${stats.users.total}</div></div>
          <div class="stat-card"><h3>Students</h3><div class="stat-value">${stats.users.student}</div></div>
          <div class="stat-card"><h3>Lecturers</h3><div class="stat-value">${stats.users.lecturer}</div></div>
          <div class="stat-card"><h3>Courses</h3><div class="stat-value">${stats.courses}</div></div>
        </div>
        <div class="stats-grid" style="margin-top:20px;">
          <div class="stat-card"><h3>Enrollments</h3><div class="stat-value">${stats.enrollments}</div></div>
          <div class="stat-card"><h3>Admins</h3><div class="stat-value">${stats.users.admin}</div></div>
        </div>
        <p class="text-center" style="margin-top:24px;">
          Manage users and courses from the sidebar, or review platform activity at a glance.
        </p>
      `;
    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading dashboard.</p>`;
    }
  }

  async function loadAnnouncements() {
    contentArea.innerHTML = `
      <div class="admin-section-header">
        <h3>Platform announcements</h3>
      </div>
      <p style="color:#64748b; margin-bottom:16px;">Posts here appear for every user. Course announcements are posted from a course page.</p>
      <div id="platformAnnouncements"><div class="loading-spinner"></div></div>
    `;
    await StudyHub.renderPlatformAnnouncements(
      document.getElementById('platformAnnouncements'),
      { canPost: true, user }
    );
  }

  function renderUserActionCell(u) {
    const isSelf = Number(u.user_id) === Number(user.user_id);
    if (isSelf) {
      return `<span class="user-self-label">You</span>`;
    }
    return `<button type="button" class="user-delete-btn" data-user-id="${u.user_id}" data-user-name="${esc(u.full_name)}" data-user-role="${u.role || 'student'}">Delete</button>`;
  }

  function bindUserDeleteHandlers() {
    document.querySelectorAll('.user-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        const userName = btn.dataset.userName;
        const userRole = btn.dataset.userRole;
        let message = `Delete user "${userName}"? This cannot be undone.`;
        if (userRole === 'lecturer') {
          message += ' All courses owned by this lecturer will also be deleted.';
        }
        if (!confirm(message)) return;

        btn.disabled = true;
        try {
          const delRes = await fetchWithAuth(`/api/auth/users/${userId}`, { method: 'DELETE' });
          const data = await delRes.json().catch(() => ({}));
          if (delRes && delRes.ok) {
            refreshActiveUsersTab();
          } else {
            alert(data.message || 'Failed to delete user.');
            btn.disabled = false;
          }
        } catch (error) {
          alert('Network error.');
          btn.disabled = false;
        }
      });
    });
  }

  function renderCourseTags(courses) {
    if (!courses || courses.length === 0) {
      return `<span class="user-no-courses">No courses</span>`;
    }
    return courses.map(c =>
      `<span class="course-tag">${esc(c.course_code)} — ${esc(c.course_title)}</span>`
    ).join('');
  }

  function userMatchesQuery(u, q) {
    return (u.full_name || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
      || (u.student_id || '').toLowerCase().includes(q);
  }

  function filterLecturersList(lecturers, query) {
    const q = query.trim().toLowerCase();
    if (!q) return lecturers;
    return lecturers.filter((l) =>
      userMatchesQuery(l, q)
      || (l.courses || []).some((c) =>
        (c.course_code || '').toLowerCase().includes(q)
        || (c.course_title || '').toLowerCase().includes(q)
      )
    );
  }

  function filterUsersList(users, query) {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => userMatchesQuery(u, q));
  }

  let usersActiveTab = null;
  let userSearchQuery = '';
  let lecturersCache = null;
  let unenrolledCache = null;
  let adminsCache = null;
  let courseOptionsCache = null;
  let selectedCourseId = null;
  let courseStudentsCache = null;
  let selectedCourseMeta = null;

  const USER_TABS = {
    lecturers: { label: 'Lecturers', icon: 'fa-chalkboard-teacher' },
    'students-by-course': { label: 'Students by Course', icon: 'fa-user-graduate' },
    unenrolled: { label: 'Not Enrolled', icon: 'fa-user' },
    admins: { label: 'Administrators', icon: 'fa-user-shield' }
  };

  function renderUsersShell() {
    const tabButtons = Object.entries(USER_TABS).map(([key, tab]) => `
      <button type="button" class="user-category-tab${usersActiveTab === key ? ' active' : ''}" data-users-tab="${key}">
        <i class="fas ${tab.icon}"></i> ${tab.label}
      </button>
    `).join('');

    contentArea.innerHTML = `
      <div class="admin-section-header">
        <h3>User management</h3>
        <button type="button" id="createLecturerBtn" class="admin-btn-primary">
          <i class="fas fa-plus"></i> Create Lecturer
        </button>
      </div>
      <div class="user-category-tabs">${tabButtons}</div>
      <div class="course-search-bar">
        <i class="fas fa-search"></i>
        <input type="search" id="userSearchInput" class="course-search-input" placeholder="Search within the selected category..." autocomplete="off" value="${userSearchQuery.replace(/"/g, '&quot;')}" ${usersActiveTab ? '' : 'disabled'} />
      </div>
      <div id="usersTabPanel" class="users-tab-panel">
        ${usersActiveTab ? '<div class="text-center"><div class="loading-spinner"></div><p>Loading...</p></div>' : '<p class="users-tab-placeholder">Choose a category above to load users.</p>'}
      </div>
    `;

    document.getElementById('createLecturerBtn')?.addEventListener('click', openLecturerModal);

    document.querySelectorAll('.user-category-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.usersTab;
        if (tab === usersActiveTab) return;
        usersActiveTab = tab;
        userSearchQuery = '';
        if (tab !== 'students-by-course') {
          selectedCourseId = null;
          courseStudentsCache = null;
          selectedCourseMeta = null;
        }
        renderUsersShell();
        loadActiveUsersTab();
      });
    });

    const searchInput = document.getElementById('userSearchInput');
    if (searchInput && usersActiveTab) {
      searchInput.addEventListener('input', (e) => {
        userSearchQuery = e.target.value;
        renderActiveUsersTabContent();
        const input = document.getElementById('userSearchInput');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      });
    }
  }

  function renderActiveUsersTabContent() {
    const panel = document.getElementById('usersTabPanel');
    if (!panel || !usersActiveTab) return;

    switch (usersActiveTab) {
      case 'lecturers':
        panel.innerHTML = renderLecturersPanel();
        break;
      case 'students-by-course':
        panel.innerHTML = renderStudentsByCoursePanel();
        break;
      case 'unenrolled':
        panel.innerHTML = renderUnenrolledPanel();
        break;
      case 'admins':
        panel.innerHTML = renderAdminsPanel();
        break;
      default:
        panel.innerHTML = '<p class="users-tab-placeholder">Choose a category above to load users.</p>';
    }

    bindUserDeleteHandlers();
    bindStudentsByCourseControls();
  }

  function renderSearchStatus(total, visible) {
    if (!userSearchQuery.trim()) return '';
    if (visible === 0) {
      return '<p class="course-search-status">No users match your search.</p>';
    }
    return `<p class="course-search-status">Showing ${visible} of ${total} users</p>`;
  }

  function renderLecturersPanel() {
    if (!lecturersCache) {
      return '<div class="text-center"><div class="loading-spinner"></div><p>Loading lecturers...</p></div>';
    }

    const filtered = filterLecturersList(lecturersCache, userSearchQuery);
    let html = renderSearchStatus(lecturersCache.length, filtered.length);

    if (filtered.length === 0) {
      html += `<p class="user-group-empty">${userSearchQuery.trim() ? 'No matching lecturers.' : 'No lecturers registered.'}</p>`;
      return html;
    }

    html += `
      <div class="enrollment-table user-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Courses taught</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    filtered.forEach((u) => {
      html += `
        <tr>
          <td><strong>${esc(u.full_name)}</strong></td>
          <td>${esc(u.email)}</td>
          <td><div class="course-tag-list">${renderCourseTags(u.courses)}</div></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>${renderUserActionCell({ ...u, role: 'lecturer' })}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderStudentsByCoursePanel() {
    if (!courseOptionsCache) {
      return '<div class="text-center"><div class="loading-spinner"></div><p>Loading courses...</p></div>';
    }

    const options = courseOptionsCache.map((c) => {
      const selected = Number(selectedCourseId) === Number(c.course_id) ? ' selected' : '';
      const count = Number(c.student_count) || 0;
      return `<option value="${c.course_id}"${selected}>${esc(c.course_code)} — ${esc(c.course_title)} (${count} student${count === 1 ? '' : 's'})</option>`;
    }).join('');

    let html = `
      <div class="user-course-picker">
        <label for="userCourseSelect">Select a course</label>
        <select id="userCourseSelect" class="user-course-select">
          <option value="">— Choose a course —</option>
          ${options}
        </select>
      </div>
    `;

    if (!selectedCourseId) {
      html += '<p class="user-group-empty">Pick a course to view enrolled students.</p>';
      return html;
    }

    if (!courseStudentsCache) {
      html += '<div class="text-center"><div class="loading-spinner"></div><p>Loading students...</p></div>';
      return html;
    }

    if (selectedCourseMeta) {
      html += `
        <div class="course-user-block">
          <h5 class="course-user-heading">
            ${esc(selectedCourseMeta.course_code)} — ${esc(selectedCourseMeta.course_title)}
            <span class="course-user-meta">Lecturer: ${esc(selectedCourseMeta.lecturer_name || 'Unknown')}</span>
          </h5>
      `;
    }

    const filtered = filterUsersList(courseStudentsCache, userSearchQuery);
    html += renderSearchStatus(courseStudentsCache.length, filtered.length);

    if (filtered.length === 0) {
      html += `<p class="user-group-empty">${userSearchQuery.trim() ? 'No matching students in this course.' : 'No students enrolled in this course.'}</p>`;
    } else {
      html += `
        <div class="enrollment-table user-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Student ID</th>
                <th>Enrolled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
      filtered.forEach((u) => {
        html += `
          <tr>
            <td><strong>${esc(u.full_name)}</strong></td>
            <td>${esc(u.email)}</td>
            <td>${esc(u.student_id) || '-'}</td>
            <td>${new Date(u.enrolled_at).toLocaleDateString()}</td>
            <td>${renderUserActionCell({ ...u, role: 'student' })}</td>
          </tr>
        `;
      });
      html += '</tbody></table></div>';
    }

    if (selectedCourseMeta) html += '</div>';
    return html;
  }

  function renderUnenrolledPanel() {
    if (!unenrolledCache) {
      return '<div class="text-center"><div class="loading-spinner"></div><p>Loading unenrolled students...</p></div>';
    }

    const filtered = filterUsersList(unenrolledCache, userSearchQuery);
    let html = renderSearchStatus(unenrolledCache.length, filtered.length);

    if (filtered.length === 0) {
      html += `<p class="user-group-empty">${userSearchQuery.trim() ? 'No matching unenrolled students.' : 'All students are enrolled in at least one course.'}</p>`;
      return html;
    }

    html += `
      <div class="enrollment-table user-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Student ID</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    filtered.forEach((u) => {
      html += `
        <tr>
          <td><strong>${esc(u.full_name)}</strong></td>
          <td>${esc(u.email)}</td>
          <td>${esc(u.student_id) || '-'}</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>${renderUserActionCell({ ...u, role: 'student' })}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderAdminsPanel() {
    if (!adminsCache) {
      return '<div class="text-center"><div class="loading-spinner"></div><p>Loading administrators...</p></div>';
    }

    const filtered = filterUsersList(adminsCache, userSearchQuery);
    let html = renderSearchStatus(adminsCache.length, filtered.length);

    if (filtered.length === 0) {
      html += `<p class="user-group-empty">${userSearchQuery.trim() ? 'No matching administrators.' : 'No administrators found.'}</p>`;
      return html;
    }

    html += `
      <div class="enrollment-table user-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    filtered.forEach((u) => {
      html += `
        <tr>
          <td><strong>${esc(u.full_name)}</strong></td>
          <td>${esc(u.email)}</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>${renderUserActionCell({ ...u, role: 'admin' })}</td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
    return html;
  }

  function bindStudentsByCourseControls() {
    const select = document.getElementById('userCourseSelect');
    if (!select) return;

    select.addEventListener('change', async () => {
      const courseId = select.value;
      if (!courseId) {
        selectedCourseId = null;
        courseStudentsCache = null;
        selectedCourseMeta = null;
        renderActiveUsersTabContent();
        return;
      }
      selectedCourseId = courseId;
      courseStudentsCache = null;
      selectedCourseMeta = courseOptionsCache.find(
        (c) => Number(c.course_id) === Number(courseId)
      ) || null;
      renderActiveUsersTabContent();
      await loadCourseStudents(courseId);
    });
  }

  async function loadCourseStudents(courseId) {
    try {
      const res = await fetchWithAuth(`/api/enrollments/course/${courseId}`);
      if (!res || !res.ok) {
        courseStudentsCache = [];
        renderActiveUsersTabContent();
        return;
      }
      courseStudentsCache = await res.json();
      renderActiveUsersTabContent();
    } catch (error) {
      const panel = document.getElementById('usersTabPanel');
      if (panel) {
        panel.innerHTML = '<p class="user-group-empty" style="color:#ef4444;">Error loading students for this course.</p>';
      }
    }
  }

  async function loadActiveUsersTab() {
    if (!usersActiveTab) return;

    try {
      switch (usersActiveTab) {
        case 'lecturers':
          if (!lecturersCache) {
            renderActiveUsersTabContent();
            const res = await fetchWithAuth('/api/auth/users/lecturers');
            if (!res || !res.ok) throw new Error('Failed to load lecturers');
            lecturersCache = await res.json();
          }
          break;
        case 'students-by-course':
          if (!courseOptionsCache) {
            renderActiveUsersTabContent();
            const res = await fetchWithAuth('/api/auth/users/course-options');
            if (!res || !res.ok) throw new Error('Failed to load courses');
            courseOptionsCache = await res.json();
            if (selectedCourseId) {
              selectedCourseMeta = courseOptionsCache.find(
                (c) => Number(c.course_id) === Number(selectedCourseId)
              ) || null;
            }
          }
          if (selectedCourseId && !courseStudentsCache) {
            renderActiveUsersTabContent();
            await loadCourseStudents(selectedCourseId);
            return;
          }
          break;
        case 'unenrolled':
          if (!unenrolledCache) {
            renderActiveUsersTabContent();
            const res = await fetchWithAuth('/api/auth/users/unenrolled-students');
            if (!res || !res.ok) throw new Error('Failed to load unenrolled students');
            unenrolledCache = await res.json();
          }
          break;
        case 'admins':
          if (!adminsCache) {
            renderActiveUsersTabContent();
            const res = await fetchWithAuth('/api/auth/users/admins');
            if (!res || !res.ok) throw new Error('Failed to load administrators');
            adminsCache = await res.json();
          }
          break;
        default:
          break;
      }
      renderActiveUsersTabContent();
    } catch (error) {
      const panel = document.getElementById('usersTabPanel');
      if (panel) {
        panel.innerHTML = '<p class="text-center" style="color:#ef4444;">Could not load users. Please try again.</p>';
      }
    }
  }

  function invalidateUsersTabCache(tab) {
    switch (tab) {
      case 'lecturers':
        lecturersCache = null;
        break;
      case 'students-by-course':
        courseOptionsCache = null;
        courseStudentsCache = null;
        selectedCourseMeta = null;
        break;
      case 'unenrolled':
        unenrolledCache = null;
        break;
      case 'admins':
        adminsCache = null;
        break;
      default:
        lecturersCache = null;
        unenrolledCache = null;
        adminsCache = null;
        courseOptionsCache = null;
        courseStudentsCache = null;
        break;
    }
  }

  async function refreshActiveUsersTab() {
    if (!usersActiveTab) {
      renderUsersShell();
      return;
    }
    invalidateUsersTabCache(usersActiveTab);
    if (usersActiveTab === 'students-by-course' && selectedCourseId) {
      courseStudentsCache = null;
    }
    await loadActiveUsersTab();
  }

  async function loadUsers() {
    usersActiveTab = null;
    userSearchQuery = '';
    selectedCourseId = null;
    courseStudentsCache = null;
    selectedCourseMeta = null;
    renderUsersShell();
  }

  // ===== Reports (admin) =====
  let reportsType = 'lecturers';
  let reportsView = 'list';
  let reportsSelectedId = null;
  let reportsStudentFilter = 'all';
  let reportsCourseId = '';
  let reportsListCache = null;
  let reportsDetailCache = null;
  let reportsCourseOptions = null;

  function buildStudentReportQuery() {
    const params = new URLSearchParams();
    if (reportsStudentFilter !== 'all') params.set('status', reportsStudentFilter);
    if (reportsCourseId) params.set('courseId', reportsCourseId);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  function renderReportsToolbar() {
    const studentFilters = reportsType === 'students' ? `
      <div class="report-filter-group">
        <label for="reportStudentFilter">Student filter</label>
        <select id="reportStudentFilter" class="user-course-select">
          <option value="all"${reportsStudentFilter === 'all' ? ' selected' : ''}>All students</option>
          <option value="enrolled"${reportsStudentFilter === 'enrolled' ? ' selected' : ''}>Enrolled only</option>
          <option value="unenrolled"${reportsStudentFilter === 'unenrolled' ? ' selected' : ''}>Not enrolled</option>
        </select>
      </div>
      <div class="report-filter-group">
        <label for="reportCourseFilter">Course (optional)</label>
        <select id="reportCourseFilter" class="user-course-select">
          <option value="">All courses</option>
          ${(reportsCourseOptions || []).map((c) => {
            const selected = String(reportsCourseId) === String(c.course_id) ? ' selected' : '';
            return `<option value="${c.course_id}"${selected}>${esc(c.course_code)} — ${esc(c.course_title)}</option>`;
          }).join('')}
        </select>
      </div>
    ` : '';

    const backBtn = reportsView === 'detail'
      ? `<button type="button" class="admin-btn-secondary" id="reportsBackBtn"><i class="fas fa-arrow-left"></i> Back to list</button>`
      : '';

    return `
      <div class="admin-section-header">
        <h3>Reports</h3>
        <div class="report-export-actions">
          ${backBtn}
          <button type="button" class="admin-btn-secondary" id="exportCsvBtn"><i class="fas fa-file-csv"></i> Export CSV</button>
          <button type="button" class="admin-btn-primary" id="exportPdfBtn"><i class="fas fa-file-pdf"></i> Export PDF</button>
        </div>
      </div>
      <div class="user-category-tabs">
        <button type="button" class="user-category-tab${reportsType === 'lecturers' ? ' active' : ''}" data-report-type="lecturers">
          <i class="fas fa-chalkboard-teacher"></i> Lecturers
        </button>
        <button type="button" class="user-category-tab${reportsType === 'students' ? ' active' : ''}" data-report-type="students">
          <i class="fas fa-user-graduate"></i> Students
        </button>
      </div>
      <div class="report-filters">${studentFilters}</div>
      <div id="reportsPanel" class="users-tab-panel"></div>
    `;
  }

  function renderReportsListPanel() {
    const panel = document.getElementById('reportsPanel');
    if (!panel) return;

    if (!reportsListCache) {
      panel.innerHTML = '<div class="text-center"><div class="loading-spinner"></div><p>Loading report...</p></div>';
      return;
    }

    if (reportsType === 'lecturers') {
      const rows = reportsListCache.lecturers || [];
      if (rows.length === 0) {
        panel.innerHTML = '<p class="user-group-empty">No lecturer data available.</p>';
        return;
      }
      let html = `<p class="course-search-status">${rows.length} lecturer(s) — generated ${new Date(reportsListCache.generated_at).toLocaleString()}</p>`;
      html += `
        <div class="enrollment-table user-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Courses</th>
                <th>No topics</th>
                <th>Students</th>
                <th>Avg Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
      rows.forEach((l) => {
        html += `
          <tr>
            <td><strong>${esc(l.full_name)}</strong></td>
            <td>${esc(l.email)}</td>
            <td>${l.course_count}</td>
            <td>${l.courses_without_topics || 0}</td>
            <td>${l.unique_students || l.total_students}</td>
            <td>${Number(l.avg_progress).toFixed(1)}%</td>
            <td><button type="button" class="admin-btn-secondary report-detail-btn" data-id="${l.lecturer_id}">View detail</button></td>
          </tr>
        `;
      });
      html += '</tbody></table></div>';
      panel.innerHTML = html;
      return;
    }

    const rows = reportsListCache.students || [];
    if (rows.length === 0) {
      panel.innerHTML = '<p class="user-group-empty">No students match the selected filters.</p>';
      return;
    }
    let html = `<p class="course-search-status">${rows.length} student(s) — generated ${new Date(reportsListCache.generated_at).toLocaleString()}</p>`;
    html += `
      <div class="enrollment-table user-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Status</th>
              <th>Courses</th>
              <th>Completed</th>
              <th>Avg Progress</th>
              <th>Study Time</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    rows.forEach((s) => {
      html += `
        <tr>
          <td><strong>${esc(s.student_name)}</strong></td>
          <td>${esc(s.student_number) || '-'}</td>
          <td>${esc(s.enrollment_status)}</td>
          <td>${s.courses_enrolled}</td>
          <td>${s.courses_completed || 0}</td>
          <td>${Number(s.avg_progress).toFixed(1)}%</td>
          <td>${s.total_study_time} min</td>
          <td>${s.last_activity_at || s.last_log_date ? new Date(s.last_activity_at || s.last_log_date).toLocaleDateString() : '-'}</td>
          <td><button type="button" class="admin-btn-secondary report-detail-btn" data-id="${s.student_id}">View detail</button></td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
    panel.innerHTML = html;
  }

  function renderReportsDetailPanel() {
    const panel = document.getElementById('reportsPanel');
    if (!panel) return;

    if (!reportsDetailCache) {
      panel.innerHTML = '<div class="text-center"><div class="loading-spinner"></div><p>Loading detail...</p></div>';
      return;
    }

    if (reportsType === 'lecturers') {
      const l = reportsDetailCache.lecturer;
      let html = `
        <div class="course-user-block">
          <h5 class="course-user-heading">${esc(l.full_name)}
            <span class="course-user-meta">${esc(l.email)} · joined ${l.created_at ? new Date(l.created_at).toLocaleDateString() : '-'}</span>
          </h5>
          <p class="course-search-status">
            ${l.course_count} course(s) · ${l.courses_without_topics || 0} without topics ·
            ${l.unique_students || 0} unique student(s) · ${l.total_students} enrolment seat(s) ·
            ${l.topics_defined || 0} topics · ${l.resources_uploaded || 0} resources ·
            ${l.students_completed || 0} completed · ${l.students_in_progress || 0} in progress ·
            Avg ${Number(l.avg_progress).toFixed(1)}%
          </p>
      `;
      if (!l.courses || l.courses.length === 0) {
        html += '<p class="user-group-empty">No courses assigned.</p></div>';
      } else {
        html += `
          <div class="enrollment-table user-table">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Topics</th>
                  <th>Enrolled</th>
                  <th>Done / Prog / NS</th>
                  <th>Idle 7d</th>
                  <th>Viewed / DL</th>
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
        `;
        l.courses.forEach((c) => {
          html += `
            <tr>
              <td>${esc(c.course_code)} — ${esc(c.course_title)}</td>
              <td>${c.topic_count || 0}</td>
              <td>${c.enrollment_count}</td>
              <td>${c.completed_count || 0} / ${c.in_progress_count || 0} / ${c.not_started_count || 0}</td>
              <td>${c.inactive_7d || 0}</td>
              <td>${c.students_viewed || 0} / ${c.students_downloaded || 0}</td>
              <td>${Number(c.avg_progress).toFixed(1)}%</td>
            </tr>
          `;
        });
        html += '</tbody></table></div>';
        l.courses.forEach((c) => {
          const students = c.students || [];
          html += `<h5 class="course-user-heading" style="margin-top:20px;">${esc(c.course_code)} students</h5>`;
          if (students.length === 0) {
            html += '<p class="user-group-empty">No students enrolled.</p>';
            return;
          }
          html += `
            <div class="enrollment-table user-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Topics</th>
                    <th>Status</th>
                    <th>Study time</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
          `;
          students.forEach((st) => {
            html += `
              <tr>
                <td>${esc(st.student_name)}</td>
                <td>${esc(st.student_number) || '-'}</td>
                <td>${st.topics_completed}/${st.topics_total}</td>
                <td>${esc(st.status)}</td>
                <td>${st.total_study_time} min</td>
                <td>${st.last_activity_at ? new Date(st.last_activity_at).toLocaleString() : '-'}</td>
              </tr>
            `;
          });
          html += '</tbody></table></div>';
        });
        html += '</div>';
      }
      panel.innerHTML = html;
      return;
    }

    const s = reportsDetailCache.student;
    const courses = reportsDetailCache.courses || [];
    let html = `
      <div class="course-user-block">
        <h5 class="course-user-heading">${esc(s.student_name)}
          <span class="course-user-meta">${esc(s.student_email)} · ID: ${esc(s.student_number) || '-'} · ${esc(s.enrollment_status)}</span>
        </h5>
        <p class="course-search-status">
          ${s.courses_enrolled} enrolled · ${s.courses_completed || 0} completed ·
          Avg ${Number(s.avg_progress).toFixed(1)}% · ${s.total_study_time} min ·
          Viewed ${s.resources_viewed || 0} · Downloaded ${s.resources_downloaded || 0} ·
          Last activity: ${s.last_activity_at || s.last_log_date ? new Date(s.last_activity_at || s.last_log_date).toLocaleString() : '-'}
        </p>
    `;
    if (courses.length === 0) {
      html += '<p class="user-group-empty">No course enrolments.</p></div>';
    } else {
      html += `
        <div class="enrollment-table user-table">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Lecturer</th>
                <th>Enrolled</th>
                <th>Topics</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Study time</th>
                <th>Resources</th>
                <th>Last activity</th>
              </tr>
            </thead>
            <tbody>
      `;
      courses.forEach((c) => {
        html += `
          <tr>
            <td>${esc(c.course_code)} — ${esc(c.course_title)}</td>
            <td>${esc(c.lecturer_name) || '-'}</td>
            <td>${new Date(c.enrolled_at).toLocaleDateString()}</td>
            <td>${Number(c.topics_completed) || 0}/${Number(c.topics_total) || 0}</td>
            <td>${esc(c.status || 'In progress')}</td>
            <td>${Number(c.completion_percentage).toFixed(1)}%</td>
            <td>${c.total_study_time} min</td>
            <td>${Number(c.resources_viewed) || 0}/${Number(c.resources_total) || 0} viewed · ${Number(c.resources_downloaded) || 0} dl</td>
            <td>${c.last_activity_at ? new Date(c.last_activity_at).toLocaleString() : '-'}</td>
          </tr>
        `;
      });
      html += '</tbody></table></div>';
      courses.forEach((c) => {
        const topics = c.topics || [];
        html += `<h5 class="course-user-heading" style="margin-top:20px;">${esc(c.course_code)} topics</h5>`;
        if (topics.length === 0) {
          html += '<p class="user-group-empty">No topics defined for this course.</p>';
          return;
        }
        html += `
          <div class="enrollment-table user-table">
            <table>
              <thead>
                <tr><th>Topic</th><th>Done</th><th>Date</th><th>Minutes</th></tr>
              </thead>
              <tbody>
        `;
        topics.forEach((t) => {
          html += `
            <tr>
              <td>${esc(t.title)}</td>
              <td>${t.completed ? 'Yes' : 'No'}</td>
              <td>${t.log_date ? new Date(t.log_date).toLocaleDateString() : '-'}</td>
              <td>${t.study_duration || '-'}</td>
            </tr>
          `;
        });
        html += '</tbody></table></div>';
      });
      html += '</div>';
    }
    panel.innerHTML = html;
  }

  function renderReportsContent() {
    if (reportsView === 'detail') renderReportsDetailPanel();
    else renderReportsListPanel();
  }

  function bindReportsControls() {
    document.querySelectorAll('[data-report-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.reportType;
        if (type === reportsType && reportsView === 'list') return;
        reportsType = type;
        reportsView = 'list';
        reportsSelectedId = null;
        reportsListCache = null;
        reportsDetailCache = null;
        loadReports();
      });
    });

    document.getElementById('reportStudentFilter')?.addEventListener('change', (e) => {
      reportsStudentFilter = e.target.value;
      reportsView = 'list';
      reportsSelectedId = null;
      reportsListCache = null;
      loadReportsData();
    });

    document.getElementById('reportCourseFilter')?.addEventListener('change', (e) => {
      reportsCourseId = e.target.value;
      reportsView = 'list';
      reportsSelectedId = null;
      reportsListCache = null;
      loadReportsData();
    });

    document.getElementById('reportsBackBtn')?.addEventListener('click', () => {
      reportsView = 'list';
      reportsSelectedId = null;
      reportsDetailCache = null;
      contentArea.innerHTML = renderReportsToolbar();
      bindReportsControls();
      renderReportsContent();
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', () => exportReport('csv'));
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => exportReport('pdf'));

    bindReportDetailButtons();
  }

  function bindReportDetailButtons() {
    document.querySelectorAll('.report-detail-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        reportsSelectedId = btn.dataset.id;
        reportsView = 'detail';
        reportsDetailCache = null;
        contentArea.innerHTML = renderReportsToolbar();
        bindReportsControls();
        renderReportsContent();
        await loadReportsDetail();
      });
    });
  }

  async function exportReport(format) {
    let url;
    if (reportsType === 'lecturers') {
      url = reportsView === 'detail' && reportsSelectedId
        ? `/api/auth/admin/reports/lecturers/${reportsSelectedId}/export?format=${format}`
        : `/api/auth/admin/reports/lecturers/export?format=${format}`;
    } else if (reportsView === 'detail' && reportsSelectedId) {
      url = `/api/auth/admin/reports/students/${reportsSelectedId}/export?format=${format}`;
    } else {
      const params = new URLSearchParams({ format });
      if (reportsStudentFilter !== 'all') params.set('status', reportsStudentFilter);
      if (reportsCourseId) params.set('courseId', reportsCourseId);
      url = `/api/auth/admin/reports/students/export?${params.toString()}`;
    }

    const btnCsv = document.getElementById('exportCsvBtn');
    const btnPdf = document.getElementById('exportPdfBtn');
    if (btnCsv) btnCsv.disabled = true;
    if (btnPdf) btnPdf.disabled = true;
    try {
      await StudyHub.downloadExport(url, `studyhub-report.${format}`);
    } finally {
      if (btnCsv) btnCsv.disabled = false;
      if (btnPdf) btnPdf.disabled = false;
    }
  }

  async function loadReportsDetail() {
    const base = reportsType === 'lecturers'
      ? `/api/auth/admin/reports/lecturers/${reportsSelectedId}`
      : `/api/auth/admin/reports/students/${reportsSelectedId}`;
    try {
      const res = await fetchWithAuth(base);
      if (!res || !res.ok) throw new Error('Failed');
      reportsDetailCache = await res.json();
      renderReportsContent();
      bindReportDetailButtons();
    } catch (error) {
      const panel = document.getElementById('reportsPanel');
      if (panel) panel.innerHTML = '<p class="user-group-empty" style="color:#ef4444;">Could not load report detail.</p>';
    }
  }

  async function loadReportsData() {
    renderReportsContent();
    try {
      if (reportsType === 'students' && !reportsCourseOptions) {
        const optRes = await fetchWithAuth('/api/auth/users/course-options');
        if (optRes && optRes.ok) {
          reportsCourseOptions = await optRes.json();
          contentArea.innerHTML = renderReportsToolbar();
          bindReportsControls();
        }
      }

      const url = reportsType === 'lecturers'
        ? '/api/auth/admin/reports/lecturers'
        : `/api/auth/admin/reports/students${buildStudentReportQuery()}`;
      const res = await fetchWithAuth(url);
      if (!res || !res.ok) throw new Error('Failed');
      reportsListCache = await res.json();
      renderReportsContent();
      bindReportDetailButtons();
    } catch (error) {
      const panel = document.getElementById('reportsPanel');
      if (panel) panel.innerHTML = '<p class="user-group-empty" style="color:#ef4444;">Could not load report data.</p>';
    }
  }

  async function loadReports() {
    if (reportsView === 'detail' && reportsSelectedId) {
      contentArea.innerHTML = renderReportsToolbar();
      bindReportsControls();
      renderReportsContent();
      await loadReportsDetail();
      return;
    }

    reportsView = 'list';
    reportsSelectedId = null;
    reportsListCache = null;
    reportsDetailCache = null;
    contentArea.innerHTML = renderReportsToolbar();
    bindReportsControls();
    await loadReportsData();
  }

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

  async function loadCourses() {
    try {
      const res = await fetch(`${StudyHub.API_BASE}/api/courses`);
      if (!res.ok) {
        contentArea.innerHTML = `<p class="text-center">Could not load courses.</p>`;
        return;
      }
      const courses = await res.json();

      contentArea.innerHTML = `
        <div class="admin-section-header"><h3>All courses on the platform</h3></div>
        <div class="course-search-bar">
          <i class="fas fa-search"></i>
          <input type="search" id="courseSearchInput" class="course-search-input" placeholder="Search by title, code, lecturer, or description..." autocomplete="off" />
        </div>
        <p id="courseSearchStatus" class="course-search-status" style="display:none;"></p>
        <div id="adminCourseGrid"></div>
      `;

      function bindCourseActions() {
        document.querySelectorAll('.manage-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            loadSection('course-detail', btn.dataset.courseId);
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="courses"]')?.classList.add('active');
          });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            openEditCourseModal(
              btn.dataset.courseId,
              btn.dataset.code,
              btn.dataset.title,
              btn.dataset.desc,
              btn.dataset.lecturerId
            );
          });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Delete this course? Enrolled students, resources, journal entries, and announcements for this course will be removed. This cannot be undone.')) return;
            try {
              const delRes = await fetchWithAuth(`/api/courses/${btn.dataset.courseId}`, { method: 'DELETE' });
              if (delRes && delRes.ok) {
                loadCourses();
              } else {
                const data = await delRes.json();
                alert(data.message || 'Delete failed.');
              }
            } catch (error) {
              alert('Network error.');
            }
          });
        });
      }

      function renderCourses(list) {
        const grid = document.getElementById('adminCourseGrid');
        const status = document.getElementById('courseSearchStatus');

        if (courses.length === 0) {
          grid.innerHTML = StudyHub.emptyStateHtml('No courses have been created yet.');
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

        let html = `<div class="course-grid">`;
        list.forEach(course => {
          html += `
            <div class="course-card">
              <h3>${esc(course.course_title)}</h3>
              <div class="code">${esc(course.course_code)}</div>
              <div class="lecturer-label">Lecturer: ${esc(course.lecturer_name || 'Unknown')}</div>
              <div class="desc">${esc(course.description) || 'No description.'}</div>
              <div class="actions">
                <button class="view-btn manage-btn" data-course-id="${course.course_id}">Manage</button>
                <button class="edit-btn" data-course-id="${course.course_id}" data-code="${esc(course.course_code)}" data-title="${esc(course.course_title)}" data-desc="${course.description || ''}" data-lecturer-id="${course.lecturer_id}">Edit</button>
                <button class="delete-btn" data-course-id="${course.course_id}">Delete</button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
        grid.innerHTML = html;
        bindCourseActions();
      }

      renderCourses(courses);

      document.getElementById('courseSearchInput').addEventListener('input', (e) => {
        renderCourses(filterCoursesBySearch(courses, e.target.value));
      });
    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading courses.</p>`;
    }
  }

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

      contentArea.innerHTML = `
        <div class="course-detail-header">
          <a class="back-link" id="backToCourses"><i class="fas fa-arrow-left"></i> Back to courses</a>
          <div style="display:flex; gap:8px;">
            <button class="edit-btn detail-edit-btn" style="background:#e2e8f0; border:none; padding:6px 14px; border-radius:8px; cursor:pointer;">Edit</button>
            <button class="delete-btn detail-delete-btn" style="background:#fee2e2; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; color:#ef4444;">Delete</button>
          </div>
        </div>
        <div class="course-detail-title">
          <h2>${esc(course.course_title)}</h2>
          <div class="meta">${esc(course.course_code)} · ${course.lecturer_name || 'Unknown lecturer'}</div>
        </div>
        <div class="tabs">
          <button class="tab-btn active" data-tab="details">Details</button>
          <button class="tab-btn" data-tab="topics">Topics</button>
          <button class="tab-btn" data-tab="students">Students</button>
          <button class="tab-btn" data-tab="resources">Resources</button>
          <button class="tab-btn" data-tab="progress">Progress</button>
          <button class="tab-btn" data-tab="announcements">Announcements</button>
        </div>
        <div id="tabContent">
          <div class="tab-content active" id="tab-details">
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:20px;">
              <p><strong>Course code</strong><br>${esc(course.course_code)}</p>
              <p><strong>Course title</strong><br>${esc(course.course_title)}</p>
              <p><strong>Lecturer</strong><br>${esc(course.lecturer_name || 'Unknown')}</p>
              <p><strong>Description</strong><br>${course.description || 'No description provided.'}</p>
            </div>
          </div>
          <div class="tab-content" id="tab-topics"><div class="loading-spinner"></div></div>
          <div class="tab-content" id="tab-students"><div class="loading-spinner"></div></div>
          <div class="tab-content" id="tab-resources"><div class="loading-spinner"></div></div>
          <div class="tab-content" id="tab-progress"><div class="loading-spinner"></div></div>
          <div class="tab-content" id="tab-announcements"><div class="loading-spinner"></div></div>
        </div>
      `;

      document.getElementById('backToCourses').addEventListener('click', (e) => {
        e.preventDefault();
        loadSection('courses');
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-section="courses"]')?.classList.add('active');
      });

      document.querySelector('.detail-edit-btn').addEventListener('click', () => {
        openEditCourseModal(
          course.course_id,
          course.course_code,
          course.course_title,
          course.description || '',
          course.lecturer_id
        );
      });

      document.querySelector('.detail-delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this course? Enrolled students, resources, journal entries, and announcements for this course will be removed.')) return;
        const delRes = await fetchWithAuth(`/api/courses/${course.course_id}`, { method: 'DELETE' });
        if (delRes && delRes.ok) {
          loadSection('courses');
          navLinks.forEach(l => l.classList.remove('active'));
          document.querySelector('[data-section="courses"]')?.classList.add('active');
        } else {
          const data = await delRes.json();
          alert(data.message || 'Delete failed.');
        }
      });

      const tabContents = {
        details: document.getElementById('tab-details'),
        topics: document.getElementById('tab-topics'),
        students: document.getElementById('tab-students'),
        resources: document.getElementById('tab-resources'),
        progress: document.getElementById('tab-progress'),
        announcements: document.getElementById('tab-announcements')
      };

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Object.values(tabContents).forEach(el => el.classList.remove('active'));
          tabContents[btn.dataset.tab].classList.add('active');

          const tab = btn.dataset.tab;
          if (tab === 'topics' && tabContents.topics.querySelector('.loading-spinner')) {
            loadTopicsTab(course.course_id);
          } else if (tab === 'students' && tabContents.students.querySelector('.loading-spinner')) {
            loadStudentsTab(course.course_id);
          } else if (tab === 'resources' && tabContents.resources.querySelector('.loading-spinner')) {
            loadResourcesTab(course.course_id);
          } else if (tab === 'progress' && tabContents.progress.querySelector('.loading-spinner')) {
            loadProgressTab(course.course_id);
          } else if (tab === 'announcements' && tabContents.announcements.querySelector('.loading-spinner')) {
            StudyHub.renderCourseAnnouncements(tabContents.announcements, course.course_id, {
              canPost: true,
              user
            });
          }
        });
      });
    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading course details.</p>`;
    }
  }

  async function loadStudentsTab(courseId) {
    const container = document.getElementById('tab-students');
    try {
      const [enrollRes, availableRes] = await Promise.all([
        fetchWithAuth(`/api/enrollments/course/${courseId}`),
        fetchWithAuth(`/api/enrollments/course/${courseId}/available-students`)
      ]);
      if (!enrollRes || !enrollRes.ok) {
        container.innerHTML = `<p>Could not load students.</p>`;
        return;
      }
      const students = await enrollRes.json();
      const available = availableRes && availableRes.ok ? await availableRes.json() : [];

      let html = StudyHub.renderStudentEnrolPanel(available);

      if (students.length === 0) {
        html += StudyHub.emptyStateHtml(
          'No students enrolled yet. Select a student above to add them to this course.'
        );
      } else {
        html += `
          <div class="enrollment-table">
            <table>
              <thead>
                <tr><th>Student ID</th><th>Name</th><th>Email</th><th>Enrolled</th><th>Actions</th></tr>
              </thead>
              <tbody>
        `;
        students.forEach(s => {
          html += `
            <tr>
              <td>${esc(s.student_id) || '-'}</td>
              <td>${esc(s.full_name)}</td>
              <td>${esc(s.email)}</td>
              <td>${new Date(s.enrolled_at).toLocaleDateString()}</td>
              <td>
                <button type="button" class="unenroll-btn staff-unenrol-btn" data-student-id="${s.user_id}" data-student-name="${esc(s.full_name)}">Remove</button>
              </td>
            </tr>
          `;
        });
        html += `</tbody></table></div>`;
      }
      container.innerHTML = html;
      StudyHub.bindStaffStudentActions(container, courseId, () => loadStudentsTab(courseId));
    } catch (error) {
      container.innerHTML = `<p style="color:#ef4444;">Error loading students.</p>`;
    }
  }

  async function loadResourcesTab(courseId) {
    const container = document.getElementById('tab-resources');
    try {
      const res = await fetchWithAuth(`/api/resources/course/${courseId}`);
      if (!res || !res.ok) {
        container.innerHTML = `<p>Could not load resources.</p>`;
        return;
      }
      const resources = await res.json();

      if (resources.length === 0) {
        container.innerHTML = StudyHub.emptyStateHtml(
          'No resources uploaded for this course yet.'
        );
        return;
      }

      let html = `<div style="background:white; border-radius:16px; border:1px solid #e2e8f0;">`;
      resources.forEach(r => {
        html += `
          <div class="resource-item">
            <div>
              <span class="title">${esc(r.title)}</span>
              <span style="font-size:13px; color:#64748b; margin-left:16px;">${esc(r.file_type)}</span>
            </div>
            <div class="actions">
              <button type="button" class="view-btn resource-view-btn" data-resource-id="${r.resource_id}">View</button>
              <button type="button" class="download-btn resource-download-btn" data-resource-id="${r.resource_id}" data-filename="${esc(r.title)}">Download</button>
              <button class="delete-btn resource-delete-btn" data-resource-id="${r.resource_id}">Delete</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      container.innerHTML = html;

      StudyHub.bindResourceActions(container);
      container.querySelectorAll('.resource-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this resource?')) return;
          try {
            const res = await fetchWithAuth(`/api/resources/${btn.dataset.resourceId}`, { method: 'DELETE' });
            if (res && res.ok) {
              loadResourcesTab(courseId);
            } else {
              alert(res?.status === 403 ? 'You do not have permission to delete this resource.' : 'Delete failed.');
            }
          } catch (error) {
            alert('Network error.');
          }
        });
      });
    } catch (error) {
      container.innerHTML = `<p style="color:#ef4444;">Error loading resources.</p>`;
    }
  }

  async function loadTopicsTab(courseId) {
    const container = document.getElementById('tab-topics');
    try {
      const res = await fetchWithAuth(`/api/courses/${courseId}/topics`);
      if (!res || !res.ok) {
        container.innerHTML = `<p>Could not load topics.</p>`;
        return;
      }
      const topics = await res.json();

      let html = `
        <div style="margin-bottom:16px;">
          <form id="addTopicForm" style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end;">
            <div class="form-group" style="margin:0; flex:1; min-width:220px;">
              <label>New topic</label>
              <input type="text" id="newTopicTitle" placeholder="e.g., Variables" required style="width:100%; padding:8px; border:2px solid #e2e8f0; border-radius:8px;">
            </div>
            <button type="submit" style="background:#667eea; color:#fff; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;">Add topic</button>
            <span id="topicStatus" style="font-size:14px;"></span>
          </form>
        </div>
      `;

      if (topics.length === 0) {
        html += StudyHub.emptyStateHtml(
          'No topics yet. Add a topic above so students can log study against it.'
        );
      } else {
        html += `<div style="background:white; border-radius:16px; border:1px solid #e2e8f0;">`;
        topics.forEach((t, index) => {
          html += `
            <div class="resource-item">
              <div><span class="title">${index + 1}. ${esc(t.title)}</span></div>
              <div class="actions">
                <button type="button" class="edit-topic-btn" data-topic-id="${t.topic_id}" data-title="${esc(t.title)}" data-order="${t.sort_order}">Rename</button>
                <button type="button" class="delete-btn delete-topic-btn" data-topic-id="${t.topic_id}">Delete</button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
      container.innerHTML = html;

      document.getElementById('addTopicForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('newTopicTitle').value.trim();
        const status = document.getElementById('topicStatus');
        const createRes = await fetchWithAuth(`/api/courses/${courseId}/topics`, {
          method: 'POST',
          body: JSON.stringify({ title })
        });
        const data = await createRes.json().catch(() => ({}));
        if (createRes.ok) loadTopicsTab(courseId);
        else {
          status.textContent = data.message || 'Could not add topic.';
          status.style.color = '#ef4444';
        }
      });

      container.querySelectorAll('.edit-topic-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const next = prompt('Topic title', btn.dataset.title);
          if (next == null) return;
          const title = next.trim();
          if (!title) return;
          const updateRes = await fetchWithAuth(`/api/courses/${courseId}/topics/${btn.dataset.topicId}`, {
            method: 'PUT',
            body: JSON.stringify({ title, sort_order: Number(btn.dataset.order) })
          });
          if (updateRes && updateRes.ok) loadTopicsTab(courseId);
          else alert('Could not rename topic.');
        });
      });

      container.querySelectorAll('.delete-topic-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this topic?')) return;
          const delRes = await fetchWithAuth(`/api/courses/${courseId}/topics/${btn.dataset.topicId}`, { method: 'DELETE' });
          const data = await delRes.json().catch(() => ({}));
          if (delRes.ok) loadTopicsTab(courseId);
          else alert(data.message || 'Could not delete topic.');
        });
      });
    } catch (error) {
      container.innerHTML = `<p style="color:#ef4444;">Error loading topics.</p>`;
    }
  }

  async function loadProgressTab(courseId) {
    const container = document.getElementById('tab-progress');
    try {
      const res = await fetchWithAuth(`/api/progress/course/${courseId}`);
      if (!res || !res.ok) {
        container.innerHTML = `<p>Could not load progress.</p>`;
        return;
      }
      const progressData = await res.json();

      if (progressData.length === 0) {
        container.innerHTML = StudyHub.emptyStateHtml(
          'No students enrolled yet. Use the Students tab to add someone to this course.'
        );
        return;
      }

      let html = `<div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:8px 0;">`;
      progressData.forEach(p => {
        const percent = parseFloat(p.completion_percentage) || 0;
        const lastActivity = p.last_activity_at ? new Date(p.last_activity_at).toLocaleString() : 'No activity yet';
        html += `
          <div class="student-progress-item" style="flex-wrap:wrap;">
            <div>
              <strong>${esc(p.student_name)}</strong>
              <span style="display:block; font-size:13px; color:#64748b; margin-top:2px;">Student ID: ${esc(p.student_id) || '-'}</span>
              <span style="display:block; font-size:13px; color:#64748b; margin-top:4px;">
                ${Number(p.topics_completed) || 0}/${Number(p.topics_total) || 0} topics · ${esc(p.status || 'In progress')} ·
                viewed ${Number(p.resources_viewed) || 0} · downloaded ${Number(p.resources_downloaded) || 0}
              </span>
              <span style="display:block; font-size:12px; color:#94a3b8;">Last activity: ${esc(lastActivity)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <div class="progress-bar"><div class="progress-fill" style="width:${percent}%;"></div></div>
              <span>${percent.toFixed(0)}%</span>
              <span style="font-size:13px; color:#64748b;">${Math.round(p.total_study_time || 0)} min</span>
              <button type="button" class="view-topics-btn" data-student-id="${p.user_id}" style="border:none; background:#eef2ff; color:#4338ca; padding:6px 10px; border-radius:8px; cursor:pointer;">Topics</button>
            </div>
            <div class="topic-checklist" id="checklist-${p.user_id}" style="display:none; width:100%; padding:0 4px 8px;"></div>
          </div>
        `;
      });
      html += `</div>`;
      container.innerHTML = html;

      container.querySelectorAll('.view-topics-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentId = btn.dataset.studentId;
          const box = document.getElementById(`checklist-${studentId}`);
          if (box.style.display === 'block') {
            box.style.display = 'none';
            return;
          }
          box.style.display = 'block';
          box.innerHTML = '<p>Loading topics...</p>';
          const listRes = await fetchWithAuth(`/api/progress/course/${courseId}/student/${studentId}`);
          if (!listRes || !listRes.ok) {
            box.innerHTML = '<p>Could not load topic checklist.</p>';
            return;
          }
          const items = await listRes.json();
          if (items.length === 0) {
            box.innerHTML = '<p>No topics defined for this course.</p>';
            return;
          }
          box.innerHTML = items.map(item => {
            const done = Number(item.completed) === 1;
            const date = item.log_date ? new Date(item.log_date).toLocaleDateString() : '';
            return `<p style="font-size:14px; margin:6px 0;">${done ? '✓' : '○'} ${esc(item.title)}${done ? ` — ${item.study_duration} min on ${date}` : ''}</p>`;
          }).join('');
        });
      });
    } catch (error) {
      container.innerHTML = `<p style="color:#ef4444;">Error loading progress.</p>`;
    }
  }

  async function loadProfile() {
    try {
      const res = await fetchWithAuth('/api/auth/profile');
      if (!res || !res.ok) {
        contentArea.innerHTML = `<p class="text-center">Could not load profile.</p>`;
        return;
      }
      const data = await res.json();
      const userData = data.user || user;

      contentArea.innerHTML = `
        <div class="profile-form">
          <h3 style="margin-bottom:20px;">Profile Settings</h3>
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
              <input type="password" id="currentPassword" />
            </div>
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input type="password" id="newPassword" placeholder="Min 6 characters" />
              <span class="error-message" id="newPasswordError"></span>
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" />
              <span class="error-message" id="confirmPasswordError"></span>
            </div>
            <button type="submit" id="profileSubmit">Update Profile</button>
            <div id="profileStatus" class="form-status"></div>
          </form>
        </div>
      `;

      document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const status = document.getElementById('profileStatus');
        const submitBtn = document.getElementById('profileSubmit');

        let errors = false;
        if (!fullName) errors = true;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors = true;
        if (newPassword && newPassword.length < 6) errors = true;
        if (newPassword && newPassword !== confirmPassword) errors = true;
        if (newPassword && !currentPassword) {
          status.textContent = 'Current password is required to set a new password.';
          status.className = 'form-status error';
          return;
        }
        if (errors) {
          status.textContent = 'Please fix the form errors.';
          status.className = 'form-status error';
          return;
        }

        submitBtn.disabled = true;
        try {
          const payload = { full_name: fullName, email };
          if (currentPassword && newPassword) {
            payload.current_password = currentPassword;
            payload.new_password = newPassword;
          }
          const updateRes = await fetchWithAuth('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          const result = await updateRes.json();
          if (updateRes.ok) {
            status.textContent = 'Profile updated successfully!';
            status.className = 'form-status success';
            user = { ...user, full_name: fullName, email };
            localStorage.setItem('user', JSON.stringify(user));
            updateUserUI();
          } else {
            status.textContent = result.message || 'Update failed.';
            status.className = 'form-status error';
          }
        } catch (error) {
          status.textContent = 'Network error.';
          status.className = 'form-status error';
        } finally {
          submitBtn.disabled = false;
        }
      });
    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading profile.</p>`;
    }
  }

  function openEditCourseModal(id, code, title, desc, lecturerId = null) {
    courseModal.classList.add('active');
    editCourseId.value = id;
    courseCode.value = code;
    courseTitle.value = title;
    courseDescription.value = desc;
    modalStatus.textContent = '';
    populateLecturerSelect(lecturerId);
  }

  async function populateLecturerSelect(selectedLecturerId = null) {
    courseLecturer.innerHTML = '<option value="">Loading lecturers...</option>';
    courseLecturer.disabled = true;

    try {
      if (!lecturersCache) {
        const res = await fetchWithAuth('/api/auth/users/lecturers');
        if (!res || !res.ok) {
          courseLecturer.innerHTML = '<option value="">Could not load lecturers</option>';
          return;
        }
        lecturersCache = await res.json();
      }

      if (!lecturersCache.length) {
        courseLecturer.innerHTML = '<option value="">No lecturers available</option>';
        return;
      }

      courseLecturer.innerHTML = lecturersCache.map((lecturer) => `
        <option value="${lecturer.user_id}">${esc(lecturer.full_name)} (${esc(lecturer.email)})</option>
      `).join('');

      if (selectedLecturerId) {
        courseLecturer.value = String(selectedLecturerId);
      }
      courseLecturer.disabled = false;
    } catch (error) {
      courseLecturer.innerHTML = '<option value="">Could not load lecturers</option>';
    }
  }

  function closeCourseModal() {
    courseModal.classList.remove('active');
  }

  function openLecturerModal() {
    lecturerModal.classList.add('active');
    lecturerForm.reset();
    lecturerStatus.textContent = '';
  }

  function closeLecturerModal() {
    lecturerModal.classList.remove('active');
  }

  modalCancelBtn.addEventListener('click', closeCourseModal);
  courseModal.addEventListener('click', (e) => {
    if (e.target === courseModal) closeCourseModal();
  });

  lecturerCancelBtn.addEventListener('click', closeLecturerModal);
  lecturerModal.addEventListener('click', (e) => {
    if (e.target === lecturerModal) closeLecturerModal();
  });

  courseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editCourseId.value;
    const payload = {
      course_code: courseCode.value.trim(),
      course_title: courseTitle.value.trim(),
      description: courseDescription.value.trim(),
      lecturer_id: Number(courseLecturer.value)
    };

    if (!payload.course_code || !payload.course_title) {
      modalStatus.textContent = 'Course code and title are required.';
      return;
    }

    if (!payload.lecturer_id) {
      modalStatus.textContent = 'Please select a lecturer.';
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        closeCourseModal();
        const activeSection = document.querySelector('.sidebar-nav a.active')?.dataset.section || 'courses';
        if (activeSection === 'courses') loadCourses();
        else if (activeSection === 'course-detail') loadCourseDetail(id);
      } else {
        modalStatus.textContent = data.message || 'Update failed.';
      }
    } catch (error) {
      modalStatus.textContent = 'Network error.';
    }
  });

  lecturerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('lecturerName').value.trim();
    const email = document.getElementById('lecturerEmail').value.trim();
    const password = document.getElementById('lecturerPassword').value;
    const submitBtn = document.getElementById('lecturerSubmitBtn');

    if (!full_name || !email || password.length < 6) {
      lecturerStatus.textContent = 'Please fill all fields. Password must be at least 6 characters.';
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await fetchWithAuth('/api/auth/users/lecturer', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        lecturersCache = null;
        closeLecturerModal();
        refreshActiveUsersTab();
      } else {
        lecturerStatus.textContent = data.message || 'Failed to create lecturer.';
      }
    } catch (error) {
      lecturerStatus.textContent = 'Network error.';
    } finally {
      submitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    StudyHub.clearSession();
    window.location.href = 'login.html';
  });

  menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992 && !sidebar.contains(e.target) && e.target !== menuToggle) {
      sidebar.classList.remove('open');
    }
  });
});
