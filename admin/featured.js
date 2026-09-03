(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const $ = id => document.getElementById(id);

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
    const binary = atob(String(value || '').replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }

  function isFeatured(text) {
    const match = String(text || '').match(/^featured:\s*(true|false)\s*$/mi);
    return Boolean(match && match[1].toLowerCase() === 'true');
  }

  function setFeatured(text, enabled) {
    const source = String(text || '');
    const line = `featured: ${enabled ? 'true' : 'false'}`;
    if (/^featured:\s*(?:true|false)\s*$/mi.test(source)) return source.replace(/^featured:\s*(?:true|false)\s*$/mi, line);
    return source.replace(/^---\s*\n/, `---\n${line}\n`);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function showStatus(message, type = '') {
    const status = $('global-status');
    if (!status) return;
    status.textContent = message;
    status.className = `status${type ? ` ${type}` : ''}`;
    status.hidden = false;
  }

  function decorateRows() {
    document.querySelectorAll('#posts-list .post-row').forEach(row => {
      if (row.querySelector('[data-feature-index]')) return;
      const edit = row.querySelector('[data-edit-index]');
      const remove = row.querySelector('[data-delete-index]');
      if (!edit || !remove) return;
      const index = edit.dataset.editIndex;
      const postInfo = row.querySelector('.post-info');
      const postTitle = postInfo?.querySelector('strong');
      const isMarked = row.dataset.featured === 'true';
      if (isMarked && postTitle) {
        const badge = document.createElement('span');
        badge.className = 'featured-badge';
        badge.textContent = '★ مميز';
        postTitle.insertAdjacentElement('afterend', badge);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `button ${isMarked ? 'button-primary' : 'button-secondary'}`;
      button.dataset.featureIndex = index;
      button.textContent = isMarked ? 'إلغاء التمييز' : 'تمييز';
      remove.insertAdjacentElement('beforebegin', button);
    });
  }

  async function refreshRowsState() {
    const data = await api('/api/posts');
    const files = Array.isArray(data) ? data : [];
    const states = files.map(file => isFeatured(decodeBase64(file.content || '')));
    document.querySelectorAll('#posts-list .post-row').forEach(row => {
      const edit = row.querySelector('[data-edit-index]');
      if (!edit) return;
      const state = Boolean(states[Number(edit.dataset.editIndex)]);
      row.dataset.featured = state ? 'true' : 'false';
      row.querySelector('[data-feature-index]')?.remove();
      row.querySelector('.featured-badge')?.remove();
    });
    decorateRows();
  }

  async function toggleFeatured(index, button) {
    if (button) button.disabled = true;
    try {
      const data = await api('/api/posts');
      const files = Array.isArray(data) ? data : [];
      const target = files[index];
      if (!target) throw new Error('تعذر العثور على الإنفوغرافيك. حدّث القائمة وحاول مجدداً.');
      const text = decodeBase64(target.content || '');
      const enabled = !isFeatured(text);
      const updated = setFeatured(text, enabled);
      await api('/api/file', {
        method: 'PUT',
        body: JSON.stringify({
          path: target.path,
          sha: target.sha,
          content: encodeBase64(updated),
          message: `${enabled ? 'Feature' : 'Unfeature'} infographic: ${target.path.split('/').pop()}`
        })
      });
      showStatus(enabled ? 'تم تمييز الإنفوغرافيك. سيظهر في قسم المميز.' : 'تم إلغاء تمييز الإنفوغرافيك.', 'success');
      document.getElementById('refresh-posts')?.click();
      setTimeout(refreshRowsState, 800);
    } catch (error) {
      showStatus(error.message || 'تعذر تغيير حالة التمييز.', 'error');
      if (button) button.disabled = false;
    }
  }

  function captureEditorState() {
    const form = $('post-form');
    if (!form || form.dataset.featureCapture) return;
    form.dataset.featureCapture = '1';
    form.addEventListener('submit', async () => {
      const slug = $('field-slug')?.value.trim();
      if (!slug) return;
      try {
        const data = await api('/api/posts');
        const target = (Array.isArray(data) ? data : []).find(file => {
          const text = decodeBase64(file.content || '');
          const match = text.match(/^slug:\s*["']?([^"'\s]+)["']?\s*$/mi);
          return match && match[1] === slug;
        });
        if (target) sessionStorage.setItem('infograf_feature_before_save', isFeatured(decodeBase64(target.content || '')) ? '1' : '0');
      } catch (_) {}
    }, true);
  }

  function preserveFeaturedAfterEdit() {
    const status = $('global-status');
    if (!status || status.dataset.featureObserver) return;
    status.dataset.featureObserver = '1';
    const observer = new MutationObserver(async () => {
      if (!(status.textContent || '').includes('تم حفظ التعديلات بنجاح')) return;
      if (sessionStorage.getItem('infograf_feature_before_save') !== '1') return;
      sessionStorage.removeItem('infograf_feature_before_save');
      try {
        const data = await api('/api/posts');
        const slug = $('field-slug')?.value.trim();
        const target = (Array.isArray(data) ? data : []).find(file => decodeBase64(file.content || '').match(new RegExp(`^slug:\\s*["']?${slug}["']?\\s*$`, 'mi')));
        if (target) {
          const text = decodeBase64(target.content || '');
          if (!isFeatured(text)) {
            await api('/api/file', {method:'PUT', body:JSON.stringify({path:target.path,sha:target.sha,content:encodeBase64(setFeatured(text,true)),message:`Preserve featured state: ${target.path.split('/').pop()}`})});
          }
        }
      } catch (_) {}
    });
    observer.observe(status, {childList:true, characterData:true, subtree:true});
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-feature-index]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    toggleFeatured(Number(button.dataset.featureIndex), button);
  }, true);

  const observer = new MutationObserver(() => {
    if ($('posts-list')) decorateRows();
  });

  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {childList:true, subtree:true});
    captureEditorState();
    preserveFeaturedAfterEdit();
    setTimeout(() => { captureEditorState(); preserveFeaturedAfterEdit(); refreshRowsState().catch(() => {}); }, 700);
  });
})();
