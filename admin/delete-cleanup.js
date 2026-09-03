(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const GITHUB_CONTENTS = 'https://api.github.com/repos/dilgash92/infograf-plus/contents/';
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
    } catch (_) { return ''; }
  }

  function parseImage(text) {
    const match = String(text || '').match(/^image:\s*(.*)$/m);
    if (!match) return '';
    const value = match[1].trim();
    try { return normalizePath(JSON.parse(value)); } catch (_) {}
    return normalizePath(value.replace(/^['"]|['"]$/g, ''));
  }

  function normalizePath(value) {
    const path = String(value || '').trim();
    if (!path || /^https?:\/\//i.test(path)) return '';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function githubPath(path) {
    return path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  }

  async function deleteUnusedImage(path, remainingFiles) {
    const target = normalizePath(path);
    if (!target || !target.startsWith('/assets/uploads/')) return;

    for (const file of Array.isArray(remainingFiles) ? remainingFiles : []) {
      if (parseImage(decodeBase64(file.content || '')) === target) return;
    }

    const response = await fetch(`${GITHUB_CONTENTS}${githubPath(target)}?ref=main`, {
      headers: {Accept:'application/vnd.github+json'}
    });
    if (response.status === 404) return;
    if (!response.ok) throw new Error('تعذر العثور على صورة الإنفوغرافيك للحذف.');
    const meta = await response.json();

    await api('/api/file', {
      method: 'DELETE',
      body: JSON.stringify({
        path: target,
        sha: meta.sha,
        message: `Delete infographic image: ${target.split('/').pop()}`
      })
    });
  }

  async function handleDeleteClick(event) {
    const button = event.target.closest('[data-delete-index]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    const index = Number(button.dataset.deleteIndex);
    if (!Number.isInteger(index)) return;

    try {
      const files = await api('/api/posts');
      const posts = Array.isArray(files) ? files : [];
      const target = posts[index];
      if (!target) throw new Error('تعذر العثور على الإنفوغرافيك المحدد. حدّث القائمة وحاول مجدداً.');

      const text = decodeBase64(target.content || '');
      const title = (text.match(/^title:\s*["']?(.+?)["']?\s*$/m) || [])[1] || target.path;
      const image = parseImage(text);
      if (!window.confirm(`هل أنت متأكد من حذف «${String(title).trim()}»؟\n\nسيتم حذف المنشور وصورته نهائياً من ملفات الموقع.`)) return;

      const status = document.getElementById('global-status');
      if (status) {
        status.textContent = 'جارٍ حذف الإنفوغرافيك والصورة...';
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

      const remaining = posts.filter((_, i) => i !== index);
      let imageWarning = '';
      try {
        await deleteUnusedImage(image, remaining);
      } catch (error) {
        imageWarning = ` المنشور حُذف، لكن تعذر حذف الصورة: ${error.message}`;
      }

      if (status) {
        status.textContent = imageWarning || 'تم حذف الإنفوغرافيك والصورة بنجاح.';
        status.className = imageWarning ? 'status error' : 'status success';
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