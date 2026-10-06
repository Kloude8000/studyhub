window.StudyHub = window.StudyHub || {};

StudyHub.formatNoticeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

StudyHub.initNotifications = (handlers = {}) => {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('notifWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'notif-wrap';
  wrap.id = 'notifWrap';
  wrap.innerHTML = `
    <button type="button" class="notif-bell" id="notifBell" aria-label="Notifications" aria-expanded="false">
      <i class="fas fa-bell"></i>
      <span class="notif-badge" id="notifBadge" hidden>0</span>
    </button>
    <div class="notif-panel" id="notifPanel" hidden>
      <div class="notif-panel-header">
        <strong>Notifications</strong>
        <button type="button" class="notif-mark-all" id="notifMarkAll">Mark all read</button>
      </div>
      <div class="notif-list" id="notifList">
        <p class="notif-empty">Loading...</p>
      </div>
    </div>
  `;
  actions.insertBefore(wrap, actions.firstChild);

  const bell = document.getElementById('notifBell');
  const badge = document.getElementById('notifBadge');
  const panel = document.getElementById('notifPanel');
  const list = document.getElementById('notifList');
  const markAll = document.getElementById('notifMarkAll');
  const esc = StudyHub.escapeHtml;

  const setBadge = (count) => {
    const unread = Number(count) || 0;
    if (unread <= 0) {
      badge.hidden = true;
      badge.textContent = '0';
      return;
    }
    badge.hidden = false;
    badge.textContent = unread > 9 ? '9+' : String(unread);
  };

  const refreshCount = async () => {
    try {
      const res = await StudyHub.fetchWithAuth('/api/notifications/unread-count');
      if (!res || !res.ok) return;
      const data = await res.json();
      setBadge(data.unread);
    } catch (error) {}
  };

  const closePanel = () => {
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
  };

  const renderList = (items) => {
    if (!items.length) {
      list.innerHTML = `<p class="notif-empty">No notifications yet. Updates about enrolments, resources, and announcements will appear here.</p>`;
      return;
    }

    list.innerHTML = items.map((item) => `
      <button type="button" class="notif-item ${item.is_read ? '' : 'unread'}" data-id="${item.notification_id}" data-link="${esc(item.link_url || '')}">
        <span class="notif-item-title">${esc(item.title)}</span>
        ${item.body ? `<span class="notif-item-body">${esc(item.body)}</span>` : ''}
        <span class="notif-item-time">${esc(StudyHub.formatNoticeTime(item.created_at))}</span>
      </button>
    `).join('');
  };

  const loadInbox = async () => {
    list.innerHTML = `<p class="notif-empty">Loading...</p>`;
    try {
      const res = await StudyHub.fetchWithAuth('/api/notifications?limit=30');
      if (!res || !res.ok) {
        list.innerHTML = `<p class="notif-empty">Could not load notifications.</p>`;
        return;
      }
      renderList(await res.json());
    } catch (error) {
      list.innerHTML = `<p class="notif-empty">Could not load notifications.</p>`;
    }
  };

  const openLink = (link) => {
    if (!link || typeof handlers.openLink !== 'function') return;
    handlers.openLink(link);
  };

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = panel.hidden;
    if (opening) {
      panel.hidden = false;
      bell.setAttribute('aria-expanded', 'true');
      loadInbox();
    } else {
      closePanel();
    }
  });

  markAll.addEventListener('click', async (e) => {
    e.stopPropagation();
    await StudyHub.fetchWithAuth('/api/notifications/read-all', { method: 'PUT' });
    setBadge(0);
    loadInbox();
  });

  list.addEventListener('click', async (e) => {
    const item = e.target.closest('.notif-item');
    if (!item) return;
    const id = item.dataset.id;
    const link = item.dataset.link;
    await StudyHub.fetchWithAuth(`/api/notifications/${id}/read`, { method: 'PUT' });
    closePanel();
    refreshCount();
    openLink(link);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closePanel();
  });

  refreshCount();
  window.setInterval(refreshCount, 60000);
};

StudyHub.canManageAnnouncement = (item, user = {}) => {
  if (!item || !user) return false;
  if (user.role === 'admin') return true;
  return Number(item.author_id) === Number(user.user_id);
};

StudyHub.canDeleteAnnouncement = StudyHub.canManageAnnouncement;

StudyHub.renderAnnouncementList = (items, options = {}) => {
  const esc = StudyHub.escapeHtml;
  const user = options.user || {};

  if (!items.length) {
    const message = options.canPost
      ? 'No announcements yet. Use the form above to post the first one.'
      : 'No announcements yet. Check back after staff post an update.';
    return StudyHub.emptyStateHtml(message);
  }

  return `<div class="announcement-list">${items.map((item) => `
    <article class="announcement-card">
      <div class="announcement-card-header">
        <div>
          <h4>${esc(item.title)}</h4>
          <span class="announcement-meta">${esc(item.author_name || 'Staff')} · ${esc(StudyHub.formatNoticeTime(item.created_at))}</span>
        </div>
        ${StudyHub.canManageAnnouncement(item, user)
          ? `<div class="announcement-actions">
              <button type="button" class="edit-announcement-btn" data-id="${item.announcement_id}" data-title="${encodeURIComponent(item.title || '')}" data-body="${encodeURIComponent(item.body || '')}">Edit</button>
              <button type="button" class="delete-announcement-btn" data-id="${item.announcement_id}">Delete</button>
            </div>`
          : ''}
      </div>
      ${item.body ? `<p>${esc(item.body)}</p>` : ''}
    </article>
  `).join('')}</div>`;
};

StudyHub.bindAnnouncementActions = (container, options = {}) => {
  if (!container) return;
  const form = container.querySelector('#announcementForm');
  const status = container.querySelector('#announcementStatus');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = container.querySelector('#announcementTitle').value.trim();
      const body = container.querySelector('#announcementBody').value.trim();
      if (!title) return;
      const res = await StudyHub.fetchWithAuth(options.createUrl, {
        method: 'POST',
        body: JSON.stringify({ title, body })
      });
      const data = await res.json().catch(() => ({}));
      if (res && res.ok) {
        if (typeof options.onRefresh === 'function') options.onRefresh();
      } else if (status) {
        status.textContent = data.message || (data.errors && data.errors.join(' ')) || 'Could not post announcement.';
        status.style.color = '#ef4444';
      }
    });
  }

  container.querySelectorAll('.delete-announcement-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this announcement?')) return;
      const res = await StudyHub.fetchWithAuth(`/api/announcements/${btn.dataset.id}`, {
        method: 'DELETE'
      });
      if (res && res.ok && typeof options.onRefresh === 'function') {
        options.onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Could not delete announcement.');
      }
    });
  });

  container.querySelectorAll('.edit-announcement-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.announcement-card');
      if (!card) return;
      const title = decodeURIComponent(btn.dataset.title || '');
      const body = decodeURIComponent(btn.dataset.body || '');
      const esc = StudyHub.escapeHtml;
      card.innerHTML = `
        <form class="announcement-edit-form">
          <input type="text" class="edit-title" maxlength="255" value="${esc(title)}" required>
          <textarea class="edit-body" rows="3">${esc(body)}</textarea>
          <div>
            <button type="submit">Save</button>
            <button type="button" class="cancel-edit">Cancel</button>
            <span class="edit-status"></span>
          </div>
        </form>
      `;
      card.querySelector('.cancel-edit').addEventListener('click', () => {
        if (typeof options.onRefresh === 'function') options.onRefresh();
      });
      card.querySelector('.announcement-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nextTitle = card.querySelector('.edit-title').value.trim();
        const nextBody = card.querySelector('.edit-body').value.trim();
        const editStatus = card.querySelector('.edit-status');
        if (!nextTitle) return;
        const res = await StudyHub.fetchWithAuth(`/api/announcements/${btn.dataset.id}`, {
          method: 'PUT',
          body: JSON.stringify({ title: nextTitle, body: nextBody })
        });
        const data = await res.json().catch(() => ({}));
        if (res && res.ok && typeof options.onRefresh === 'function') {
          options.onRefresh();
        } else if (editStatus) {
          editStatus.textContent = data.message || (data.errors && data.errors.join(' ')) || 'Could not save.';
          editStatus.style.color = '#ef4444';
        }
      });
    });
  });
};

StudyHub.announcementFormHtml = () => `
  <form id="announcementForm" class="announcement-form">
    <div class="form-group" style="margin:0;">
      <label for="announcementTitle">Title</label>
      <input type="text" id="announcementTitle" maxlength="255" placeholder="Announcement title" required>
    </div>
    <div class="form-group" style="margin:0;">
      <label for="announcementBody">Message</label>
      <textarea id="announcementBody" rows="3" placeholder="Optional details"></textarea>
    </div>
    <div>
      <button type="submit" class="admin-btn-primary" style="background:#667eea; color:#fff; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600;">Post announcement</button>
      <span id="announcementStatus" style="margin-left:8px; font-size:14px;"></span>
    </div>
  </form>
`;

StudyHub.renderCourseAnnouncements = async (container, courseId, options = {}) => {
  if (!container) return;
  try {
    const res = await StudyHub.fetchWithAuth(`/api/announcements/course/${courseId}`);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      container.innerHTML = `<p class="text-center">${data.message || 'Could not load announcements.'}</p>`;
      return;
    }
    const items = await res.json();
    container.innerHTML = `
      ${options.canPost ? StudyHub.announcementFormHtml() : ''}
      ${StudyHub.renderAnnouncementList(items, options)}
    `;
    StudyHub.bindAnnouncementActions(container, {
      createUrl: `/api/announcements/course/${courseId}`,
      onRefresh: () => StudyHub.renderCourseAnnouncements(container, courseId, options)
    });
  } catch (error) {
    container.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading announcements.</p>`;
  }
};

StudyHub.renderPlatformAnnouncements = async (container, options = {}) => {
  if (!container) return;
  try {
    const res = await StudyHub.fetchWithAuth('/api/announcements/platform');
    if (!res || !res.ok) {
      container.innerHTML = `<p class="text-center">Could not load announcements.</p>`;
      return;
    }
    const items = await res.json();
    container.innerHTML = `
      ${options.canPost ? StudyHub.announcementFormHtml() : ''}
      ${StudyHub.renderAnnouncementList(items, options)}
    `;
    StudyHub.bindAnnouncementActions(container, {
      createUrl: '/api/announcements/platform',
      onRefresh: () => StudyHub.renderPlatformAnnouncements(container, options)
    });
  } catch (error) {
    container.innerHTML = `<p class="text-center" style="color:#ef4444;">Error loading announcements.</p>`;
  }
};
