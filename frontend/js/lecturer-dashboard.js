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

  // Modal refs
  const modalOverlay = document.getElementById('courseModal');
  const modalTitle = document.getElementById('modalTitle');
  const courseForm = document.getElementById('courseForm');
  const editCourseId = document.getElementById('editCourseId');
  const courseCode = document.getElementById('courseCode');
  const courseTitle = document.getElementById('courseTitle');
  const courseDescription = document.getElementById('courseDescription');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalStatus = document.getElementById('modalStatus');

  // ===== Load user info =====
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {}

  function startApp() {
    if (!StudyHub.requireRole(['lecturer'], user)) return;
    updateUserUI();
    StudyHub.initNotifications({
      openLink: (link) => {
        if (link === 'announcement:platform') {
          setActiveNav('announcements');
          loadSection('announcements');
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
    userRoleEl.textContent = user.role || 'lecturer';
    const initials = (user.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    userAvatar.textContent = initials;
    greeting.textContent = `Welcome back, ${user.full_name || 'User'}!`;
  }

  // ===== Navigation =====
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');

  function setActiveNav(section) {
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.section === section);
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      loadSection(section);
      setActiveNav(section);
      sidebar.classList.remove('open');
    });
  });

  // ===== Load sections =====
  async function loadSection(section, params = null) {
    const titles = {
      dashboard: 'Dashboard',
      courses: 'My Courses',
      create: 'Create Course',
      announcements: 'Announcements',
      profile: 'Profile',
      settings: 'Profile'
    };
    pageTitle.textContent = titles[section] || 'Dashboard';

    if (section !== 'create') {
      contentArea.innerHTML = `<div class="text-center"><div class="loading-spinner"></div><p>Loading...</p></div>`;
    }

    switch (section) {
      case 'dashboard': await loadDashboard(); break;
      case 'courses': await loadCourses(); break;
      case 'create':
        await loadCourses();
        openCreateModal();
        break;
      case 'announcements': await loadAnnouncements(); break;
      case 'profile':
      case 'settings':
        await loadSettings();
        break;
      case 'course-detail': await loadCourseDetail(params); break;
      default: contentArea.innerHTML = '<p>Section not found.</p>';
    }
  }

  // ===== DASHBOARD =====
  async function loadDashboard() {
    try {
      const coursesRes = await fetchWithAuth('/api/courses/my-courses');
      if (!coursesRes || !coursesRes.ok) { contentArea.innerHTML = `<p class="text-center">Could not load overview.</p>`; return; }
      const courses = await coursesRes.json();

      const totalCourses = courses.length;
      let totalStudents = 0;
      let avgProgress = 0;
      let notStarted = 0;
      let inProgressCount = 0;
      let completed = 0;
      const recentEnrolments = [];

      if (totalCourses > 0) {
        const [enrollmentResults, progressResults] = await Promise.all([
          Promise.all(courses.map(c => fetchWithAuth(`/api/enrollments/course/${c.course_id}`))),
          Promise.all(courses.map(c => fetchWithAuth(`/api/progress/course/${c.course_id}`)))
        ]);

        const studentIds = new Set();
        for (let i = 0; i < enrollmentResults.length; i += 1) {
          const res = enrollmentResults[i];
          if (res && res.ok) {
            const enrollments = await res.json();
            enrollments.forEach((e) => {
              studentIds.add(e.user_id);
              recentEnrolments.push({
                name: e.full_name,
                course: courses[i].course_code,
                enrolled_at: e.enrolled_at
              });
            });
          }
        }
        totalStudents = studentIds.size;

        let progressSum = 0;
        let progressCount = 0;
        for (const res of progressResults) {
          if (res && res.ok) {
            const progress = await res.json();
            progress.forEach((p) => {
              const percent = parseFloat(p.completion_percentage) || 0;
              progressSum += percent;
              progressCount += 1;
              if (p.completed_at || percent >= 100) completed += 1;
              else if (percent <= 0) notStarted += 1;
              else inProgressCount += 1;
            });
          }
        }
        avgProgress = progressCount > 0 ? progressSum / progressCount : 0;
      }

      recentEnrolments.sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at));
      const latest = recentEnrolments.slice(0, 5);

      let html = `
        <div class="stats-grid">
          <div class="stat-card"><h3>Courses Taught</h3><div class="stat-value">${totalCourses}</div></div>
          <div class="stat-card"><h3>Total Students</h3><div class="stat-value">${totalStudents}</div></div>
          <div class="stat-card"><h3>Avg Progress</h3><div class="stat-value">${avgProgress.toFixed(1)}%</div></div>
        </div>
      `;

      if (totalCourses === 0) {
        html += StudyHub.emptyStateHtml(
          'You have not created any courses yet.',
          { section: 'create', label: 'Create a course' }
        );
      } else {
        html += `
          <div class="digest-grid">
            <div class="digest-card"><h4>Not started</h4><div class="stat-value">${notStarted}</div></div>
            <div class="digest-card"><h4>In progress</h4><div class="stat-value">${inProgressCount}</div></div>
            <div class="digest-card"><h4>Completed</h4><div class="stat-value">${completed}</div></div>
          </div>
          <div class="digest-list">
            <h3>Recent enrolments</h3>
            ${latest.length === 0
              ? StudyHub.emptyStateHtml('No students enrolled yet. Open a course and use the Students tab to add someone.')
              : `<ul>${latest.map((item) => `<li>${esc(item.name)} enrolled in ${esc(item.course)} · ${new Date(item.enrolled_at).toLocaleDateString()}</li>`).join('')}</ul>`}
          </div>
        `;
      }

      contentArea.innerHTML = html;
      StudyHub.bindEmptyStateActions(contentArea);
    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading dashboard.</p>`;
    }
  }

  async function loadAnnouncements() {
    contentArea.innerHTML = `
      <h3 style="margin:0 0 8px;">Platform announcements</h3>
      <p style="color:#64748b; margin-bottom:16px;">Notices posted by administrators. Course announcements are on each course page.</p>
      <div id="platformAnnouncements"><div class="loading-spinner"></div></div>
    `;
    await StudyHub.renderPlatformAnnouncements(
      document.getElementById('platformAnnouncements'),
      { canPost: false, user }
    );
  }

  // ===== MY COURSES =====
  async function loadCourses() {
    try {
      const res = await fetchWithAuth('/api/courses/my-courses');
      if (!res || !res.ok) { contentArea.innerHTML = `<p class="text-center">Could not load courses.</p>`; return; }
      const courses = await res.json();

      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 style="margin:0;">Courses you own and manage.</h3>
          <button id="createCourseBtn" class="btn-primary" style="background:#667eea; color:#fff; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600;">
            <i class="fas fa-plus"></i> Create Course
          </button>
        </div>
      `;

      if (courses.length === 0) {
        html += StudyHub.emptyStateHtml(
          'Create your first course so students can enrol and you can upload materials.',
          { section: 'create', label: 'Create a course' }
        );
      } else {
        html += `<div class="course-grid">`;
        courses.forEach(course => {
          html += `
            <div class="course-card">
              <h3>${esc(course.course_title)}</h3>
              <div class="code">${esc(course.course_code)}</div>
              <div class="desc">${esc(course.description) || ''}</div>
              <div class="actions">
                <button class="manage-btn" data-course-id="${course.course_id}">Manage course</button>
                <button class="edit-btn" data-course-id="${course.course_id}" data-code="${esc(course.course_code)}" data-title="${esc(course.course_title)}" data-desc="${esc(course.description) || ''}">Edit</button>
                <button class="delete-btn" data-course-id="${course.course_id}">Delete</button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
      contentArea.innerHTML = html;
      StudyHub.bindEmptyStateActions(contentArea);

      // Event listeners
      document.getElementById('createCourseBtn').addEventListener('click', () => openCreateModal());

      document.querySelectorAll('.manage-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const courseId = btn.dataset.courseId;
          // Load course detail view
          loadSection('course-detail', courseId);
          // Update nav active state
          navLinks.forEach(l => l.classList.remove('active'));
          document.querySelector('[data-section="courses"]')?.classList.add('active');
        });
      });

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.dataset.courseId;
          const code = btn.dataset.code;
          const title = btn.dataset.title;
          const desc = btn.dataset.desc;
          openEditModal(id, code, title, desc);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.dataset.courseId;
          if (!confirm('Delete this course? Enrolled students, resources, journal entries, and announcements for this course will be removed.')) return;
          try {
            const res = await fetchWithAuth(`/api/courses/${id}`, { method: 'DELETE' });
            if (res && res.ok) {
              loadCourses();
            } else {
              const data = await res.json();
              alert(data.message || 'Delete failed.');
            }
          } catch (error) {
            alert('Network error.');
          }
        });
      });

    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading courses.</p>`;
    }
  }

  // ===== COURSE DETAIL VIEW =====
  async function loadCourseDetail(courseId) {
    try {
      // Fetch course details
      const res = await fetchWithAuth(`/api/courses/${courseId}`);
      if (!res || !res.ok) { contentArea.innerHTML = `<p class="text-center">Could not load course.</p>`; return; }
      const course = await res.json();

      // Build the view with tabs
      let html = `
        <div class="course-detail-header">
          <a class="back-link" id="backToCourses"><i class="fas fa-arrow-left"></i> Back to courses</a>
          <div style="display:flex; gap:8px;">
            <button class="edit-btn" style="background:#e2e8f0; border:none; padding:6px 14px; border-radius:8px; cursor:pointer;">Edit</button>
            <button class="delete-btn" style="background:#fee2e2; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; color:#ef4444;">Delete</button>
          </div>
        </div>
        <div class="course-detail-title">
          <h2>${esc(course.course_title)}</h2>
          <div class="meta">${esc(course.course_code)} · ${esc(course.lecturer_name || 'You')}</div>
        </div>
        <div class="tabs">
          <button class="tab-btn active" data-tab="details">Details</button>
          <button class="tab-btn" data-tab="topics">Topics</button>
          <button class="tab-btn" data-tab="resources">Resources</button>
          <button class="tab-btn" data-tab="students">Students</button>
          <button class="tab-btn" data-tab="progress">Progress</button>
          <button class="tab-btn" data-tab="announcements">Announcements</button>
        </div>
        <div id="tabContent">
          <div class="tab-content active" id="tab-details">
            <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:20px;">
              <p><strong>Course code</strong><br>${esc(course.course_code)}</p>
              <p><strong>Course title</strong><br>${esc(course.course_title)}</p>
              <p><strong>Description</strong><br>${esc(course.description) || 'No description provided.'}</p>
            </div>
          </div>
          <div class="tab-content" id="tab-topics">
            <div class="loading-spinner"></div>
          </div>
          <div class="tab-content" id="tab-resources">
            <!-- Loaded dynamically -->
            <div class="loading-spinner"></div>
          </div>
          <div class="tab-content" id="tab-students">
            <div class="loading-spinner"></div>
          </div>
          <div class="tab-content" id="tab-progress">
            <div class="loading-spinner"></div>
          </div>
          <div class="tab-content" id="tab-announcements">
            <div class="loading-spinner"></div>
          </div>
        </div>
      `;
      contentArea.innerHTML = html;

      // Back button
      document.getElementById('backToCourses').addEventListener('click', () => loadSection('courses'));

      // Edit and Delete buttons for course (same as in list)
      document.querySelector('.course-detail-header .edit-btn').addEventListener('click', () => {
        openEditModal(course.course_id, course.course_code, course.course_title, course.description || '');
      });
      document.querySelector('.course-detail-header .delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this course? Enrolled students, resources, journal entries, and announcements for this course will be removed.')) return;
        try {
          const res = await fetchWithAuth(`/api/courses/${course.course_id}`, { method: 'DELETE' });
          if (res && res.ok) {
            loadSection('courses');
          } else {
            const data = await res.json();
            alert(data.message || 'Delete failed.');
          }
        } catch (error) {
          alert('Network error.');
        }
      });

      // Tab switching
      const tabBtns = document.querySelectorAll('.tab-btn');
      const tabContents = {
        details: document.getElementById('tab-details'),
        topics: document.getElementById('tab-topics'),
        resources: document.getElementById('tab-resources'),
        students: document.getElementById('tab-students'),
        progress: document.getElementById('tab-progress'),
        announcements: document.getElementById('tab-announcements')
      };

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.tab;
          Object.keys(tabContents).forEach(key => {
            tabContents[key].classList.remove('active');
          });
          tabContents[tab].classList.add('active');
          if (tab === 'topics' && tabContents.topics.innerHTML.includes('loading-spinner')) {
            loadTopicsTab(course.course_id);
          } else if (tab === 'resources' && tabContents.resources.innerHTML.includes('loading-spinner')) {
            loadResourcesTab(course.course_id);
          } else if (tab === 'students' && tabContents.students.innerHTML.includes('loading-spinner')) {
            loadStudentsTab(course.course_id);
          } else if (tab === 'progress' && tabContents.progress.innerHTML.includes('loading-spinner')) {
            loadProgressTab(course.course_id);
          } else if (tab === 'announcements' && tabContents.announcements.innerHTML.includes('loading-spinner')) {
            StudyHub.renderCourseAnnouncements(tabContents.announcements, course.course_id, {
              canPost: true,
              user
            });
          }
        });
      });

      // Load first tab content (details already loaded)
      // Preload resources, students, progress in background? Not needed.
      // Optionally load them on first click.

    } catch (error) {
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading course details.</p>`;
    }
  }

  // ===== Helper: load resources tab =====
  async function loadResourcesTab(courseId) {
    const container = document.getElementById('tab-resources');
    try {
      const res = await fetchWithAuth(`/api/resources/course/${courseId}`);
      if (!res || !res.ok) { container.innerHTML = `<p>Could not load resources.</p>`; return; }
      const resources = await res.json();

      let html = `
        <div style="margin-bottom:16px;">
          <button id="uploadResourceBtn" style="background:#667eea; color:#fff; border:none; padding:6px 14px; border-radius:8px; cursor:pointer;">Upload Resource</button>
        </div>
        <div id="uploadFormContainer" style="display:none; background:#f8fafc; padding:16px; border-radius:12px; margin-bottom:16px; border:1px dashed #cbd5e1;">
          <form id="uploadResourceForm">
            <div class="form-group">
              <label>Title</label>
              <input type="text" id="resourceTitle" placeholder="e.g., Lecture 1" required style="width:100%; padding:8px; border:2px solid #e2e8f0; border-radius:8px;">
            </div>
            <div class="form-group">
              <label>File</label>
              <input type="file" id="resourceFile" accept=".pdf,.mp4,.png,.jpg,.jpeg" required style="width:100%;">
              <p style="margin:6px 0 0; font-size:13px; color:#64748b;">PDF, MP4, PNG, or JPEG up to 200 MB. Stay on this page until the upload finishes.</p>
            </div>
            <button type="submit" id="resourceUploadSubmit" style="background:#667eea; color:#fff; border:none; padding:6px 16px; border-radius:8px; cursor:pointer;">Upload</button>
            <span id="uploadStatus" style="margin-left:12px; font-size:14px;"></span>
          </form>
        </div>
      `;

      if (resources.length === 0) {
        html += StudyHub.emptyStateHtml(
          'No resources yet. Upload a PDF, video, or image using the button above.'
        );
      } else {
        html += `<div style="background:white; border-radius:16px; border:1px solid #e2e8f0;">`;
        resources.forEach(r => {
          html += `
            <div class="resource-item">
              <div>
                <span class="title">${esc(r.title)}</span>
                <span style="font-size:13px; color:#64748b; margin-left:16px;">${esc(r.file_type)}</span>
              </div>
              <div class="actions">
                <button type="button" class="view-btn" data-resource-id="${r.resource_id}">View</button>
                <button type="button" class="download-btn" data-resource-id="${r.resource_id}" data-filename="${esc(r.title)}">Download</button>
                <button class="delete-btn" data-resource-id="${r.resource_id}">Delete</button>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
      container.innerHTML = html;
      StudyHub.bindResourceActions(container);

      // Upload toggle
      document.getElementById('uploadResourceBtn')?.addEventListener('click', () => {
        const formContainer = document.getElementById('uploadFormContainer');
        formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
      });

      // Upload form submit
      document.getElementById('uploadResourceForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('resourceTitle').value.trim();
        const fileInput = document.getElementById('resourceFile');
        const status = document.getElementById('uploadStatus');
        const submitBtn = document.getElementById('resourceUploadSubmit');
        if (!title || !fileInput.files.length) {
          status.textContent = 'Please fill title and select a file.';
          status.style.color = '#ef4444';
          return;
        }
        const file = fileInput.files[0];
        if (file.size > StudyHub.MAX_UPLOAD_BYTES) {
          status.textContent = 'File is too large. Maximum size is 200 MB.';
          status.style.color = '#ef4444';
          return;
        }
        const formData = new FormData();
        formData.append('title', title);
        formData.append('file', file);

        const warnIfLeaving = (event) => {
          event.preventDefault();
          event.returnValue = '';
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        status.textContent = 'Uploading… please wait.';
        status.style.color = '#475569';
        window.addEventListener('beforeunload', warnIfLeaving);

        try {
          const res = await StudyHub.uploadResource(courseId, formData, {
            onProgress: (percent) => {
              status.textContent = `Uploading… ${percent}%`;
              status.style.color = '#475569';
            }
          });
          if (!res) return;
          if (res.ok) {
            status.textContent = 'Upload successful!';
            status.style.color = '#22c55e';
            loadResourcesTab(courseId);
          } else {
            status.textContent = res.data.message || 'Upload failed.';
            status.style.color = '#ef4444';
          }
        } catch (error) {
          status.textContent = error.message === 'Upload cancelled'
            ? 'Upload cancelled.'
            : 'Network error. Stay on this page and try again.';
          status.style.color = '#ef4444';
        } finally {
          window.removeEventListener('beforeunload', warnIfLeaving);
          if (submitBtn.isConnected) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Upload';
          }
        }
      });

      // Delete resource
      document.querySelectorAll('#tab-resources .delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const resourceId = btn.dataset.resourceId;
          if (!confirm('Delete this resource?')) return;
          try {
            const res = await fetchWithAuth(`/api/resources/${resourceId}`, { method: 'DELETE' });
            if (res && res.ok) {
              loadResourcesTab(courseId);
            } else {
              alert('Delete failed.');
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

  // ===== Helper: load students tab =====
  async function loadStudentsTab(courseId) {
    const container = document.getElementById('tab-students');
    try {
      const [enrollRes, availableRes] = await Promise.all([
        fetchWithAuth(`/api/enrollments/course/${courseId}`),
        fetchWithAuth(`/api/enrollments/course/${courseId}/available-students`)
      ]);
      if (!enrollRes || !enrollRes.ok) { container.innerHTML = `<p>Could not load students.</p>`; return; }
      const students = await enrollRes.json();
      const available = availableRes && availableRes.ok ? await availableRes.json() : [];

      let html = StudyHub.renderStudentEnrolPanel(available);

      if (students.length === 0) {
        html += StudyHub.emptyStateHtml(
          'No students enrolled yet. Select a student above to add them to this course.'
        );
      } else {
        html += `<div style="background:white; border-radius:16px; border:1px solid #e2e8f0; overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#f8fafc;"><th style="padding:12px 16px; text-align:left;">Student ID</th><th style="padding:12px 16px; text-align:left;">Student</th><th style="padding:12px 16px; text-align:left;">Email</th><th style="padding:12px 16px; text-align:left;">Enrolled</th><th style="padding:12px 16px; text-align:left;">Actions</th></tr></thead>
            <tbody>
        `;
        students.forEach(s => {
          html += `
            <tr><td style="padding:12px 16px; border-top:1px solid #f1f5f9;">${esc(s.student_id) || '-'}</td>
            <td style="padding:12px 16px; border-top:1px solid #f1f5f9;">${esc(s.full_name)}</td>
            <td style="padding:12px 16px; border-top:1px solid #f1f5f9;">${esc(s.email)}</td>
            <td style="padding:12px 16px; border-top:1px solid #f1f5f9;">${new Date(s.enrolled_at).toLocaleDateString()}</td>
            <td style="padding:12px 16px; border-top:1px solid #f1f5f9;">
              <button type="button" class="unenroll-btn staff-unenrol-btn" data-student-id="${s.user_id}" data-student-name="${esc(s.full_name)}">Remove</button>
            </td></tr>
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

  // ===== Helper: load progress tab =====
  async function loadTopicsTab(courseId) {
    const container = document.getElementById('tab-topics');
    try {
      const res = await fetchWithAuth(`/api/courses/${courseId}/topics`);
      if (!res || !res.ok) { container.innerHTML = `<p>Could not load topics.</p>`; return; }
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
              <div>
                <span class="title">${index + 1}. ${esc(t.title)}</span>
              </div>
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
        if (!title) return;
        const createRes = await fetchWithAuth(`/api/courses/${courseId}/topics`, {
          method: 'POST',
          body: JSON.stringify({ title })
        });
        const data = await createRes.json().catch(() => ({}));
        if (createRes.ok) {
          loadTopicsTab(courseId);
        } else {
          status.textContent = data.message || (data.errors && data.errors.join(' ')) || 'Could not add topic.';
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
          else {
            const data = await updateRes.json().catch(() => ({}));
            alert(data.message || 'Could not rename topic.');
          }
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
      if (!res || !res.ok) { container.innerHTML = `<p>Could not load progress.</p>`; return; }
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

  // ===== SETTINGS (profile) =====
  async function loadSettings() {
    // Reuse the profile form from student dashboard
    try {
      const res = await fetchWithAuth('/api/auth/profile');
      if (!res || !res.ok) { contentArea.innerHTML = `<p class="text-center">Could not load profile.</p>`; return; }
      const data = await res.json();
      const userData = data.user || user;

      let html = `
        <div class="profile-form">
          <h3 style="margin-bottom:20px;">Settings</h3>
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
      contentArea.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading settings.</p>`;
    }
  }

  // ===== MODAL functions =====
  function openCreateModal() {
    modalOverlay.classList.add('active');
    modalTitle.textContent = 'Create Course';
    modalSubmitBtn.textContent = 'Create Course';
    editCourseId.value = '';
    courseCode.value = '';
    courseTitle.value = '';
    courseDescription.value = '';
    modalStatus.textContent = '';
  }

  function openEditModal(id, code, title, desc) {
    modalOverlay.classList.add('active');
    modalTitle.textContent = 'Edit Course';
    modalSubmitBtn.textContent = 'Update Course';
    editCourseId.value = id;
    courseCode.value = code;
    courseTitle.value = title;
    courseDescription.value = desc;
    modalStatus.textContent = '';
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
  }

  modalCancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  courseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editCourseId.value;
    const code = courseCode.value.trim();
    const title = courseTitle.value.trim();
    const desc = courseDescription.value.trim();

    if (!code || !title) {
      modalStatus.textContent = 'Course code and title are required.';
      return;
    }

    const payload = { course_code: code, course_title: title, description: desc };
    const url = id ? `/api/courses/${id}` : '/api/courses/create';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        const activeSection = document.querySelector('.sidebar-nav a.active')?.dataset.section || 'courses';
        if (activeSection === 'courses' || activeSection === 'create') {
          loadCourses();
        } else if (activeSection === 'course-detail') {
          const detailId = editCourseId.value;
          if (detailId) loadCourseDetail(detailId);
        }
      } else {
        modalStatus.textContent = data.message || 'Operation failed.';
      }
    } catch (error) {
      modalStatus.textContent = 'Network error.';
    }
  });

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