window.StudyHub = window.StudyHub || {};

StudyHub.escapeHtml = (value) => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

StudyHub.clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

StudyHub.requireRole = (allowedRoles, user) => {
  if (!user || !allowedRoles.includes(user.role)) {
    const target = user?.role && StudyHub.DASHBOARD_URLS[user.role]
      ? StudyHub.DASHBOARD_URLS[user.role]
      : 'login.html';
    window.location.href = target;
    return false;
  }
  return true;
};

StudyHub.emptyStateHtml = (message, action) => {
  const esc = StudyHub.escapeHtml;
  let actionHtml = '';
  if (action?.section && action.label) {
    actionHtml = `<a href="#" class="empty-state-action" data-section="${esc(action.section)}">${esc(action.label)}</a>`;
  } else if (action?.buttonId && action.label) {
    actionHtml = `<button type="button" class="empty-state-action" id="${esc(action.buttonId)}">${esc(action.label)}</button>`;
  }
  return `<div class="empty-state"><p>${esc(message)}</p>${actionHtml}</div>`;
};

StudyHub.bindEmptyStateActions = (container) => {
  if (!container) return;
  container.querySelectorAll('.empty-state-action[data-section]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector(`.sidebar-nav a[data-section="${el.dataset.section}"]`)?.click();
    });
  });
};
