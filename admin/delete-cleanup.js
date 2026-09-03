(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';

  const session = () => sessionStorage.getItem(SESSION_KEY) || '';
  const headers = () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(session() ? { Authorization: `Bearer ${session()}` } : {})
  });

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...headers(), ...(options.headers || {}) }
    });
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data?.message || data?.error || `حدث خطأ (${response.status})`);
    return data;
  }

  function decodeBase64(value) {
    try {
      const binary = atob(String(value || '').replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_) {
      return '';
    }
  }

  async function handleDeleteClick(event) {
    const button = event.target.closest('[data-delete-index]');
    if (!button) return;

    // Make this capture handler the only delete path.
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    const index = Number(button.dataset.deleteIndex);
    if (!Number.isInteger(index)) return;

    try {
      const data = await api('/api/posts');
      const files = Array.isArray(data) ? data : [];
      const target = files[index];
      if (!target) throw new Error('تعذر العثور على الإنفوغرافيك المحدد. حدّث القائمة وحاول مجدداً.');

      const text = decodeBase64(target.content || '');
      const title = (text.match(/^title:\s*["']?(.+?)["']?\s*$/m) || [])[1] || target.path;
      if (!window.confirm(`هل أنت متأكد من حذف «${String(title).trim()}»؟\n\nسيُحذف ملف الإنفوغرافيك فقط.`)) return;

      const status = document.getElementById('global-status');
      if (status) {
        status.textContent = 'جارٍ حذف الإنفوغرافيك...';
        status.className = 'status';
        status.hidden = false;
      }

      await api('/api/file', {
        method: 'DELETE',
        body: JSON.stringify({
          path: target.path,
          sha: target.sha,
          message: `Delete infographic: ${String(title).trim()}`
        })
      });

      if (status) {
        status.textContent = 'تم حذف الإنفوغرافيك بنجاح.';
        status.className = 'status success';
        status.hidden = false;
      }

      document.getElementById('refresh-posts')?.click();
    } catch (error) {
      const status = document.getElementById('global-status');
      if (status) {
        status.textContent = error.message || 'تعذر حذف الإنفوغرافيك.';
        status.className = 'status error';
        status.hidden = false;
      }
    }
  }

  document.addEventListener('click', handleDeleteClick, true);
})();
