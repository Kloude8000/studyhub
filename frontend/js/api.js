window.StudyHub = window.StudyHub || {};

StudyHub.MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

StudyHub.uploadResource = (courseId, formData, { onProgress } = {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${StudyHub.API_BASE}/api/resources/upload/${courseId}`);
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch (error) {
        data = {};
      }
      if (xhr.status === 401) {
        StudyHub.clearSession();
        window.location.href = 'login.html';
        resolve(null);
        return;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data
      });
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(formData);
  });
};

StudyHub.fetchWithAuth = async (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${StudyHub.API_BASE}${url}`;
  const token = localStorage.getItem('token');
  const merged = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  };

  const response = await fetch(fullUrl, merged);

  if (response.status === 401) {
    StudyHub.clearSession();
    window.location.href = 'login.html';
    return null;
  }

  return response;
};

StudyHub.fetchResource = async (resourceId, action) => {
  const token = localStorage.getItem('token');
  const response = await fetch(
    `${StudyHub.API_BASE}/api/resources/${resourceId}/${action}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (response.status === 401) {
    StudyHub.clearSession();
    window.location.href = 'login.html';
    return null;
  }

  return response;
};

StudyHub.bindResourceActions = (container, hooks = {}) => {
  if (!container) return;

  container.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const resourceId = btn.dataset.resourceId;
      btn.disabled = true;
      try {
        const res = await StudyHub.fetchResource(resourceId, 'view');
        if (!res || !res.ok) {
          alert(res?.status === 403 ? 'You do not have permission to view this resource.' : 'Could not open resource.');
          return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        if (typeof hooks.onSuccess === 'function') hooks.onSuccess('view', resourceId);
      } catch (error) {
        alert('Network error.');
      } finally {
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll('.download-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const resourceId = btn.dataset.resourceId;
      const filename = btn.dataset.filename || 'resource';
      btn.disabled = true;
      try {
        const res = await StudyHub.fetchResource(resourceId, 'download');
        if (!res || !res.ok) {
          alert(res?.status === 403 ? 'You do not have permission to download this resource.' : 'Could not download resource.');
          return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(blobUrl);
        if (typeof hooks.onSuccess === 'function') hooks.onSuccess('download', resourceId);
      } catch (error) {
        alert('Network error.');
      } finally {
        btn.disabled = false;
      }
    });
  });
};

StudyHub.downloadExport = async (url, fallbackFilename = 'report') => {
  const token = localStorage.getItem('token');
  const fullUrl = url.startsWith('http') ? url : `${StudyHub.API_BASE}${url}`;
  const response = await fetch(fullUrl, {
    headers: { Authorization: `Bearer ${token}` }
});

  if (response.status === 401) {
    StudyHub.clearSession();
    window.location.href = 'login.html';
    return false;
  }

  if (!response.ok) {
    let message = 'Could not download report.';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch (e) {}
    alert(message);
    return false;
  }

  const blob = await response.blob();
  let filename = fallbackFilename;
  const disposition = response.headers.get('Content-Disposition');
  const match = disposition && disposition.match(/filename="([^"]+)"/);
  if (match) filename = match[1];

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
  return true;
};

StudyHub.renderStudentEnrolPanel = (available) => {
  const esc = StudyHub.escapeHtml;
  if (!available.length) {
    return `<p class="enrol-hint">All registered students are already enrolled in this course.</p>`;
  }
  return `
    <form id="enrolStudentForm" class="enrol-student-form">
      <label for="enrolStudentSelect">Add a student</label>
      <div class="enrol-student-row">
        <select id="enrolStudentSelect" required>
          <option value="">Select a student</option>
          ${available.map((s) => `
            <option value="${s.user_id}">${esc(s.full_name)}${s.student_id ? ` (${esc(s.student_id)})` : ''}</option>
          `).join('')}
        </select>
        <button type="submit">Enrol student</button>
      </div>
      <span id="enrolStudentStatus"></span>
    </form>
  `;
};

StudyHub.bindStudentEnrolForm = (container, courseId, onSuccess) => {
  const form = container.querySelector('#enrolStudentForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const select = container.querySelector('#enrolStudentSelect');
    const status = container.querySelector('#enrolStudentStatus');
    const studentId = Number(select.value);
    if (!studentId) return;
    const res = await StudyHub.fetchWithAuth(`/api/enrollments/course/${courseId}/students`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId })
    });
    const data = await res.json().catch(() => ({}));
    if (res && res.ok) {
      if (typeof onSuccess === 'function') onSuccess();
    } else if (status) {
      status.textContent = data.message || 'Could not enrol student.';
      status.style.color = '#ef4444';
    }
  });
};

StudyHub.bindStudentUnenrolButtons = (container, courseId, onSuccess) => {
  container.querySelectorAll('.staff-unenrol-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const name = btn.dataset.studentName || 'this student';
      const confirmed = window.confirm(
        `Remove ${name} from this course? Their journal and progress for this course will be deleted.`
      );
      if (!confirmed) return;
      const studentId = Number(btn.dataset.studentId);
      if (!studentId) return;
      const res = await StudyHub.fetchWithAuth(
        `/api/enrollments/course/${courseId}/students/${studentId}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (res && res.ok) {
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        alert(data.message || 'Could not remove student.');
      }
    });
  });
};

StudyHub.bindStaffStudentActions = (container, courseId, onReload) => {
  StudyHub.bindStudentEnrolForm(container, courseId, onReload);
  StudyHub.bindStudentUnenrolButtons(container, courseId, onReload);
};
