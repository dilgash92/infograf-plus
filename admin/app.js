(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const categories = [
    'العالم','سياسة','اقتصاد ومال','تقنية','علوم','صحة','رياضة','ترفيه',
    'سيارات','سفر','تعليم','تاريخ','مجتمع','فن وثقافة','طبيعة وبيئة','منوع'
  ];

  let posts = [];
  let editingPost = null;

  const $ = (id) => document.getElementById(id);

  function showStatus(target, message, type = '') {
    if (!target) return;
    target.textContent = message;
    target.className = `status${type ? ` ${type}` : ''}`;
    target.hidden = false;
  }

  function hideStatus(target) {
    if (target) target.hidden = true;
  }

  function setGlobalStatus(message, type = '') {
    showStatus($('global-status'), message, type);
  }

  function getSession() {
    return sessionStorage.getItem(SESSION_KEY) || '';
  }

  function setSession(value) {
    if (value) sessionStorage.setItem(SESSION_KEY, value);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function apiHeaders() {
    const session = getSession();
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session}` } : {})
    };
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...apiHeaders(), ...(options.headers || {}) }
    });

    let data = null;
    try { data = await response.json(); } catch (_) {}

    if (response.status === 401) {
      clearSession();
      showLogin();
      throw new Error('انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد.');
    }

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `حدث خطأ (${response.status})`);
    }

    return data;
  }

  function base64FromText(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function safeDecodeBase64(value) {
    try {
      const binary = atob(String(value || '').replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_) {
      return '';
    }
  }

  function parseFrontMatter(text) {
    const match = String(text || '').match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n([\s\S]*))?$/);
    if (!match) return { data: {}, body: '' };

    const data = {};
    const lines = match[1].split('\n');
    let currentKey = null;

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;

      const scalar = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (scalar) {
        currentKey = scalar[1];
        let value = scalar[2].trim();

        if (value === '|') {
          data[currentKey] = '';
        } else {
          try {
            data[currentKey] = JSON.parse(value);
          } catch (_) {
            data[currentKey] = value.replace(/^['"]|['"]$/g, '');
          }
        }
        continue;
      }

      if (currentKey && /^\s{2,}/.test(rawLine)) {
        const continuation = rawLine.trim();
        data[currentKey] = data[currentKey]
          ? `${data[currentKey]}\n${continuation}`
          : continuation;
      }
    }

    return { data, body: match[2] || '' };
  }

  function yamlQuote(value) {
    return JSON.stringify(String(value ?? ''));
  }

  function makePostMarkdown(fields) {
    const lines = [
      '---',
      'layout: infographic',
      `title: ${yamlQuote(fields.title)}`,
      `date: ${yamlQuote(fields.date)}`,
      `category: ${yamlQuote(fields.category)}`,
      `description: ${yamlQuote(fields.description)}`,
      `source: ${yamlQuote(fields.source)}`,
      `image: ${yamlQuote(fields.image)}`
    ];

    if (fields.image_alt) {
      lines.push(`image_alt: ${yamlQuote(fields.image_alt)}`);
    }

    lines.push('---', '');

    if (fields.body) {
      lines.push(fields.body.trim(), '');
    }

    return lines.join('\n');
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      || `infographic-${Date.now()}`;
  }

  function normalizeDateForInput(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);

    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return new Intl.DateTimeFormat('ar-DE', { dateStyle: 'medium' }).format(d);
  }

  function livePostUrl(post) {
    const filename = String(post?.path || '').split('/').pop() || '';
    const withoutExtension = filename.replace(/\.md$/i, '');
    const match = withoutExtension.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
    const slug = match ? match[1] : slugify(post?.data?.title || '');
    return `../infographic/${encodeURIComponent(slug)}/`;
  }

  function switchView(view) {
    document.querySelectorAll('.view').forEach(section => {
      section.hidden = section.id !== `${view}-view`;
    });

    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === view);
    });

    const titles = {
      dashboard: 'لوحة التحكم',
      posts: 'الإنفوغرافيكات',
      editor: editingPost ? 'تعديل الإنفوغرافيك' : 'إضافة إنفوغرافيك'
    };

    $('page-heading').textContent = titles[view] || 'لوحة التحكم';
    hideStatus($('global-status'));
  }

  function showLogin() {
    $('login-view').hidden = false;
    $('admin-view').hidden = true;
    hideStatus($('global-status'));
    const button = $('login-button');
    if (button) {
      button.disabled = false;
      button.textContent = 'تسجيل الدخول عبر GitHub';
    }
  }

  function showAdmin(user) {
    $('login-view').hidden = true;
    $('admin-view').hidden = false;
    $('user-name').textContent = user?.name || user?.login || 'GitHub';
  }

  function startLogin() {
    const button = $('login-button');
    button.disabled = true;
    button.textContent = 'جارٍ فتح GitHub...';
    hideStatus($('login-status'));
    window.location.href = `${API}/auth/login`;
  }

  function consumeAuthFragment() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#auth=')) return false;

    const value = decodeURIComponent(hash.slice('#auth='.length));
    if (value) setSession(value);

    history.replaceState(null, document.title, window.location.pathname + window.location.search);
    return Boolean(value);
  }

  function resetEditor() {
    editingPost = null;
    $('post-form').reset();
    $('editor-eyebrow').textContent = 'إنشاء';
    $('editor-title').textContent = 'إضافة إنفوغرافيك جديد';
    $('save-post').textContent = 'حفظ الإنفوغرافيك';
    $('current-image').textContent = '';
    $('image-preview').hidden = true;
    $('image-preview').innerHTML = '';
    $('field-date').value = normalizeDateForInput(new Date().toISOString());
  }

  function editPost(post) {
    editingPost = post;
    switchView('editor');

    $('editor-eyebrow').textContent = 'تعديل';
    $('editor-title').textContent = 'تعديل الإنفوغرافيك';
    $('save-post').textContent = 'حفظ التعديلات';

    $('field-title').value = post.data.title || '';
    $('field-category').value = post.data.category || '';
    $('field-date').value = normalizeDateForInput(post.data.date);
    $('field-source').value = post.data.source || '';
    $('field-description').value = post.data.description || '';
    $('field-alt').value = post.data.image_alt || '';
    $('field-body-editor').value = post.body || '';
    $('field-image').value = '';

    $('current-image').textContent = post.data.image
      ? `الصورة الحالية: ${post.data.image}`
      : 'لا توجد صورة حالياً.';

    $('image-preview').hidden = true;
    $('image-preview').innerHTML = '';
  }

  function renderRecent() {
    const container = $('recent-posts');
    const recent = [...posts]
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0))
      .slice(0, 5);

    if (!recent.length) {
      container.innerHTML = '<div class="empty-admin">لا توجد إنفوغرافيكات بعد.</div>';
      return;
    }

    container.innerHTML = recent.map(post => `
      <div class="mini-post">
        ${post.data.image
          ? `<img src="${escapeHtml(post.data.image)}" alt="">`
          : '<div class="mini-post img"></div>'}
        <div>
          <strong>${escapeHtml(post.data.title || 'بدون عنوان')}</strong>
          <small>${escapeHtml(post.data.category || '')} · ${escapeHtml(formatDate(post.data.date))}</small>
        </div>
      </div>
    `).join('');
  }

  function renderPosts(filter = '') {
    const container = $('posts-list');
    const q = normalizeSearch(filter);

    const filtered = posts
      .filter(post => {
        if (!q) return true;
        return [post.data.title, post.data.category, post.data.description]
          .filter(Boolean)
          .some(value => normalizeSearch(value).includes(q));
      })
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-admin">لا توجد نتائج.</div>';
      return;
    }

    container.innerHTML = filtered.map(post => {
      const index = posts.indexOf(post);
      return `
        <article class="post-row">
          ${post.data.image
            ? `<img src="${escapeHtml(post.data.image)}" alt="">`
            : '<div></div>'}
          <div class="post-info">
            <strong>${escapeHtml(post.data.title || 'بدون عنوان')}</strong>
            <small>${escapeHtml(post.data.category || 'بدون قسم')} · ${escapeHtml(formatDate(post.data.date))}</small>
          </div>
          <div class="post-actions">
            <button class="button button-secondary" type="button" data-edit-index="${index}">تعديل</button>
            <a class="button button-secondary" href="${livePostUrl(post)}" target="_blank" rel="noopener">عرض</a>
            <button class="button button-danger" type="button" data-delete-index="${index}">حذف</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function updateStats() {
    $('stat-total').textContent = posts.length;

    const latest = [...posts]
      .sort((a, b) => new Date(b.data.date || 0) - new Date(a.data.date || 0))[0];

    $('stat-latest').textContent = latest ? formatDate(latest.data.date) : '—';
    $('stat-categories').textContent = new Set(
      posts.map(post => post.data.category).filter(Boolean)
    ).size;
  }

  function normalizeSearch(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ـ/g, '')
      .replace(/\s+/g, ' ');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[ch]));
  }

  async function loadPosts() {
    const data = await api('/api/posts');

    const loaded = [];

    for (const file of Array.isArray(data) ? data : []) {
      const text = safeDecodeBase64(file.content || '');
      const parsed = parseFrontMatter(text);
      loaded.push({
        path: file.path,
        sha: file.sha,
        data: parsed.data,
        body: parsed.body
      });
    }

    posts = loaded;
    updateStats();
    renderRecent();
    renderPosts($('post-search').value);
  }

  async function uploadImage(file) {
    if (!file) return null;

    const ext = (file.name.split('.').pop() || 'png')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'png';

    const cleanBase = slugify(
      file.name.replace(/\.[^.]+$/, '')
    ).slice(0, 70);

    const filename = `${Date.now()}-${cleanBase || 'infographic'}.${ext}`;
    const path = `assets/uploads/${filename}`;
    const buffer = await file.arrayBuffer();

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }

    const content = btoa(binary);

    await api('/api/file', {
      method: 'PUT',
      body: JSON.stringify({
        path,
        content,
        message: `Upload infographic image: ${filename}`
      })
    });

    return `/${path}`;
  }

  async function savePost(event) {
    event.preventDefault();

    const button = $('save-post');
    button.disabled = true;
    button.textContent = editingPost ? 'جارٍ الحفظ...' : 'جارٍ الإنشاء...';
    hideStatus($('global-status'));

    try {
      const title = $('field-title').value.trim();
      const category = $('field-category').value;
      const date = $('field-date').value;
      const description = $('field-description').value.trim();
      const source = $('field-source').value.trim();
      const imageAlt = $('field-alt').value.trim();
      const body = $('field-body-editor').value.trim();
      const file = $('field-image').files[0];

      if (!title || !category || !date) {
        throw new Error('يرجى تعبئة العنوان والقسم والتاريخ.');
      }

      if (!editingPost && !file) {
        throw new Error('يرجى اختيار صورة الإنفوغرافيك.');
      }

      let image = editingPost?.data?.image || '';
      if (file) image = await uploadImage(file);

      const isoDate = new Date(date).toISOString();
      const markdown = makePostMarkdown({
        title,
        category,
        date: isoDate,
        description,
        source,
        image_alt: imageAlt,
        image,
        body
      });

      if (editingPost) {
        await api('/api/file', {
          method: 'PUT',
          body: JSON.stringify({
            path: editingPost.path,
            sha: editingPost.sha,
            content: base64FromText(markdown),
            message: `Update infographic: ${title}`
          })
        });

        setGlobalStatus('تم حفظ التعديلات بنجاح. الموقع سيُحدّث تلقائياً.', 'success');
      } else {
        const filename = `${isoDate.slice(0, 10)}-${slugify(title)}.md`;
        const path = `_posts/${filename}`;

        await api('/api/file', {
          method: 'PUT',
          body: JSON.stringify({
            path,
            content: base64FromText(markdown),
            message: `Add infographic: ${title}`
          })
        });

        setGlobalStatus('تمت إضافة الإنفوغرافيك بنجاح. الموقع سيُحدّث تلقائياً.', 'success');
      }

      await loadPosts();
      resetEditor();
      switchView('posts');
    } catch (error) {
      setGlobalStatus(error.message || 'تعذر حفظ الإنفوغرافيك.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = editingPost ? 'حفظ التعديلات' : 'حفظ الإنفوغرافيك';
    }
  }

  async function deletePost(post) {
    const title = post.data.title || 'هذا الإنفوغرافيك';
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف «${title}»؟\n\nلا يمكن التراجع عن حذف المنشور من المستودع.`
    );

    if (!confirmed) return;

    try {
      setGlobalStatus('جارٍ الحذف...');

      await api('/api/file', {
        method: 'DELETE',
        body: JSON.stringify({
          path: post.path,
          sha: post.sha,
          message: `Delete infographic: ${title}`
        })
      });

      setGlobalStatus('تم حذف الإنفوغرافيك بنجاح.', 'success');
      await loadPosts();
    } catch (error) {
      setGlobalStatus(error.message || 'تعذر حذف الإنفوغرافيك.', 'error');
    }
  }

  function previewSelectedImage() {
    const file = $('field-image').files[0];
    const preview = $('image-preview');

    if (!file) {
      preview.hidden = true;
      preview.innerHTML = '';
      return;
    }

    const url = URL.createObjectURL(file);
    preview.hidden = false;
    preview.innerHTML = `<img src="${url}" alt="معاينة الصورة المختارة">`;
  }

  async function initialize() {
    consumeAuthFragment();

    if (!getSession()) {
      showLogin();
      return;
    }

    try {
      const user = await api('/api/me');
      showAdmin(user);
      await loadPosts();
      switchView('dashboard');
    } catch (error) {
      if (getSession()) {
        showStatus($('login-status'), error.message || 'تعذر تحميل لوحة الإدارة.', 'error');
      }
    }
  }

  function bindEvents() {
    $('login-button').addEventListener('click', startLogin);

    $('logout-button').addEventListener('click', () => {
      clearSession();
      showLogin();
      showStatus($('login-status'), 'تم تسجيل الخروج.', 'success');
    });

    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        if (view === 'editor') resetEditor();
        switchView(view);
      });
    });

    document.querySelectorAll('[data-go]').forEach(button => {
      button.addEventListener('click', () => {
        const view = button.dataset.go;
        if (view === 'editor') resetEditor();
        switchView(view);
      });
    });

    $('cancel-edit').addEventListener('click', () => {
      resetEditor();
      switchView('posts');
    });

    $('post-form').addEventListener('submit', savePost);
    $('field-image').addEventListener('change', previewSelectedImage);

    $('post-search').addEventListener('input', event => {
      renderPosts(event.target.value);
    });

    $('refresh-posts').addEventListener('click', async () => {
      try {
        setGlobalStatus('جارٍ تحديث القائمة...');
        await loadPosts();
        setGlobalStatus('تم تحديث القائمة.', 'success');
      } catch (error) {
        setGlobalStatus(error.message || 'تعذر تحديث القائمة.', 'error');
      }
    });

    $('posts-list').addEventListener('click', event => {
      const editButton = event.target.closest('[data-edit-index]');
      if (editButton) {
        const post = posts[Number(editButton.dataset.editIndex)];
        if (post) editPost(post);
        return;
      }

      const deleteButton = event.target.closest('[data-delete-index]');
      if (deleteButton) {
        const post = posts[Number(deleteButton.dataset.deleteIndex)];
        if (post) deletePost(post);
      }
    });
  }

  bindEvents();
  initialize();
})();
