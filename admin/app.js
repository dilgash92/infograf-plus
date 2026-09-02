(() => {
  'use strict';

  const CLIENT_ID = 'Iv23lRICGj31g9Ec1cV';
  const OWNER = 'dilgash92';
  const REPO = 'infograf-plus';
  const BRANCH = 'main';
  const POSTS_PATH = '_posts';
  const UPLOADS_PATH = 'assets/uploads';
  const TOKEN_KEY = 'infograf_plus_github_token';
  const USER_KEY = 'infograf_plus_github_user';
  const API = 'https://api.github.com';

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

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function apiHeaders() {
    const token = getToken();
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async function github(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...apiHeaders(), ...(options.headers || {}) }
    });

    let data = null;
    try { data = await response.json(); } catch (_) {}

    if (!response.ok) {
      const message = data?.message || `GitHub API error (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function base64FromArrayBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64FromText(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }

  function safeDecodeBase64(value) {
    try {
      const binary = atob(value.replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_) {
      return '';
    }
  }

  function parseFrontMatter(text) {
    const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n([\s\S]*))?$/);
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
          value = value.replace(/^['"]|['"]$/g, '');
          data[currentKey] = value;
        }
        continue;
      }
      if (currentKey && /^\s{2,}/.test(rawLine)) {
        const continuation = rawLine.trim();
        data[currentKey] = data[currentKey] ? `${data[currentKey]}\n${continuation}` : continuation;
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
      `layout: infographic`,
      `title: ${yamlQuote(fields.title)}`,
      `date: ${yamlQuote(fields.date)}`,
      `category: ${yamlQuote(fields.category)}`,
      `description: ${yamlQuote(fields.description)}`,
      `source: ${yamlQuote(fields.source)}`,
      `image: ${yamlQuote(fields.image)}`
    ];

    if (fields.image_alt) lines.push(`image_alt: ${yamlQuote(fields.image_alt)}`);
    lines.push('---', '');
    if (fields.body) lines.push(fields.body.trim(), '');
    return lines.join('\n');
  }

  function slugify(title) {
    return String(title || '')
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || `infographic-${Date.now()}`;
  }

  function normalizeDateForInput(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 16);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('ar-DE', { dateStyle: 'medium' }).format(d);
  }

  function switchView(view) {
    document.querySelectorAll('.view').forEach(section => {
      section.hidden = section.id !== `${view}-view`;
    });
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === view);
    });

    const titles = { dashboard: 'لوحة التحكم', posts: 'الإنفوغرافيكات', editor: editingPost ? 'تعديل الإنفوغرافيك' : 'إضافة إنفوغرافيك' };
    $('page-heading').textContent = titles[view] || 'لوحة التحكم';
    hideStatus($('global-status'));
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
    $('current-image').textContent = post.data.image ? `الصورة الحالية: ${post.data.image}` : 'لا توجد صورة حالياً.';
  }

  function renderRecent() {
    const container = $('recent-posts');
    const recent = [...posts].sort((a,b) => new Date(b.data.date || 0) - new Date(a.data.date || 0)).slice(0, 5);
    if (!recent.length) {
      container.innerHTML = '<div class="empty-admin">لا توجد إنفوغرافيكات بعد.</div>';
      return;
    }
    container.innerHTML = recent.map(post => `
      <div class="mini-post">
        ${post.data.image ? `<img src="${escapeHtml(post.data.image)}" alt="">` : '<div class="mini-post img"></div>'}
        <div><strong>${escapeHtml(post.data.title || 'بدون عنوان')}</strong><small>${escapeHtml(post.data.category || '')} · ${escapeHtml(formatDate(post.data.date))}</small></div>
      </div>
    `).join('');
  }

  function renderPosts(filter = '') {
    const container = $('posts-list');
    const q = filter.trim().toLowerCase();
    const filtered = posts.filter(post => {
      if (!q) return true;
      return [post.data.title, post.data.category, post.data.description]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
    }).sort((a,b) => new Date(b.data.date || 0) - new Date(a.data.date || 0));

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-admin">لا توجد نتائج.</div>';
      return;
    }

    container.innerHTML = filtered.map((post, index) => `
      <article class="post-row">
        ${post.data.image ? `<img src="${escapeHtml(post.data.image)}" alt="">` : '<div></div>'}
        <div class="post-info">
          <strong>${escapeHtml(post.data.title || 'بدون عنوان')}</strong>
          <small>${escapeHtml(post.data.category || 'بدون قسم')} · ${escapeHtml(formatDate(post.data.date))}</small>
        </div>
        <div class="post-actions">
          <button class="button button-secondary" type="button" data-edit-index="${posts.indexOf(post)}">تعديل</button>
          <a class="button button-secondary" href="../infographic/${encodeURIComponent(slugify(post.data.title))}/" target="_blank" rel="noopener">عرض</a>
          <button class="button button-danger" type="button" data-delete-index="${posts.indexOf(post)}">حذف</button>
        </div>
      </article>
    `).join('');
  }

  function updateStats() {
    $('stat-total').textContent = posts.length;
    const latest = [...posts].sort((a,b) => new Date(b.data.date || 0) - new Date(a.data.date || 0))[0];
    $('stat-latest').textContent = latest ? formatDate(latest.data.date) : '—';
    $('stat-categories').textContent = new Set(posts.map(p => p.data.category).filter(Boolean)).size;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  }

  async function loadPosts() {
    const data = await github(`/repos/${OWNER}/${REPO}/contents/${POSTS_PATH}?ref=${BRANCH}`);
    const files = Array.isArray(data) ? data.filter(item => item.type === 'file' && item.name.endsWith('.md')) : [];

    const loaded = await Promise.all(files.map(async file => {
      const item = await github(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}?ref=${BRANCH}`);
      const text = safeDecodeBase64(item.content || '');
      const parsed = parseFrontMatter(text);
      return { path: file.path, sha: item.sha, data: parsed.data, body: parsed.body };
    }));

    posts = loaded;
    updateStats();
    renderRecent();
    renderPosts($('post-search').value);
  }

  async function uploadImage(file) {
    if (!file) return null;
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanBase = slugify(file.name.replace(/\.[^.]+$/, '')).slice(0, 70);
    const filename = `${Date.now()}-${cleanBase || 'infographic'}.${ext}`;
    const path = `${UPLOADS_PATH}/${filename}`;
    const buffer = await file.arrayBuffer();
    const content = base64FromArrayBuffer(buffer);

    const response = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Upload infographic image: ${filename}`, content, branch: BRANCH })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'فشل رفع الصورة');
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

      if (!title || !category || !date) throw new Error('يرجى تعبئة العنوان والقسم والتاريخ.');
      if (!editingPost && !file) throw new Error('يرجى اختيار صورة الإنفوغرافيك.');

      let image = editingPost?.data?.image || '';
      if (file) image = await uploadImage(file);

      const isoDate = new Date(date).toISOString();
      const markdown = makePostMarkdown({ title, category, date: isoDate, description, source, image_alt: imageAlt, image, body });

      if (editingPost) {
        const response = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(editingPost.path).replace(/%2F/g, '/')}`, {
          method: 'PUT',
          headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Update infographic: ${title}`, content: base64FromText(markdown), sha: editingPost.sha, branch: BRANCH })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'فشل حفظ التعديل');
      } else {
        const filename = `${isoDate.slice(0,10)}-${slugify(title)}.md`;
        const path = `${POSTS_PATH}/${filename}`;
        const response = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
          method: 'PUT',
          headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `Add infographic: ${title}`, content: base64FromText(markdown), branch: BRANCH })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'فشل إنشاء الإنفوغرافيك');
      }

      setGlobalStatus('تم الحفظ بنجاح. انتظر قليلاً حتى يعيد GitHub Pages بناء الموقع.', 'success');
      await loadPosts();
      resetEditor();
      switchView('posts');
      setGlobalStatus('تم الحفظ بنجاح. قد يستغرق ظهور التغيير على الموقع دقيقة أو دقيقتين.', 'success');
    } catch (error) {
      console.error(error);
      setGlobalStatus(error.message || 'حدث خطأ أثناء الحفظ.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = editingPost ? 'حفظ التعديلات' : 'حفظ الإنفوغرافيك';
    }
  }

  async function deletePost(post) {
    if (!post) return;
    const ok = window.confirm(`هل تريد حذف «${post.data.title || 'هذا الإنفوغرافيك'}» نهائياً؟`);
    if (!ok) return;

    try {
      setGlobalStatus('جارٍ الحذف...');
      const response = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(post.path).replace(/%2F/g, '/')}`, {
        method: 'DELETE',
        headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Delete infographic: ${post.data.title || post.path}`, sha: post.sha, branch: BRANCH })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'فشل حذف الإنفوغرافيك');
      await loadPosts();
      setGlobalStatus('تم حذف الإنفوغرافيك.', 'success');
    } catch (error) {
      setGlobalStatus(error.message || 'حدث خطأ أثناء الحذف.', 'error');
    }
  }

  async function startDeviceLogin() {
    const button = $('login-button');
    button.disabled = true;
    button.textContent = 'جارٍ الاتصال بـ GitHub...';
    hideStatus($('login-status'));

    try {
      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, scope: 'repo' })
      });
      const data = await response.json();
      if (!response.ok || !data.device_code) throw new Error(data.error_description || 'تعذر بدء تسجيل الدخول.');

      showStatus($('login-status'), `افتح صفحة GitHub وأدخل الرمز: ${data.user_code}\nسيتم التحقق تلقائياً.`, '');
      const verificationUrl = data.verification_uri || 'https://github.com/login/device';
      window.open(verificationUrl, '_blank', 'noopener');

      const interval = Math.max(Number(data.interval) || 5, 5) * 1000;
      const expiresAt = Date.now() + (Number(data.expires_in) || 900) * 1000;

      while (Date.now() < expiresAt) {
        await new Promise(resolve => setTimeout(resolve, interval));
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: CLIENT_ID, device_code: data.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
        });
        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
          localStorage.setItem(TOKEN_KEY, tokenData.access_token);
          await finishLogin();
          return;
        }
        if (tokenData.error === 'authorization_pending') continue;
        if (tokenData.error === 'slow_down') { await new Promise(resolve => setTimeout(resolve, 5000)); continue; }
        throw new Error(tokenData.error_description || 'لم يكتمل تسجيل الدخول.');
      }
      throw new Error('انتهت مدة رمز الدخول. اضغط تسجيل الدخول وحاول مرة أخرى.');
    } catch (error) {
      console.error(error);
      showStatus($('login-status'), error.message || 'تعذر تسجيل الدخول.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'تسجيل الدخول عبر GitHub';
    }
  }

  async function finishLogin() {
    try {
      const user = await github('/user');
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (user.login !== OWNER) throw new Error('هذا الحساب غير مخوّل لإدارة Infograf+. استخدم حساب GitHub المالك للموقع.');
      $('user-name').textContent = user.login;
      $('login-view').hidden = true;
      $('admin-view').hidden = false;
      switchView('dashboard');
      setGlobalStatus('تم تسجيل الدخول.', 'success');
      await loadPosts();
    } catch (error) {
      clearToken();
      $('login-view').hidden = false;
      $('admin-view').hidden = true;
      showStatus($('login-status'), error.message || 'تعذر التحقق من الحساب.', 'error');
    }
  }

  async function boot() {
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.view === 'editor') resetEditor();
        switchView(button.dataset.view);
      });
    });

    document.querySelectorAll('[data-go]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.go === 'editor') resetEditor();
        switchView(button.dataset.go);
      });
    });

    $('login-button').addEventListener('click', startDeviceLogin);
    $('logout-button').addEventListener('click', () => {
      clearToken();
      location.reload();
    });
    $('cancel-edit').addEventListener('click', () => { resetEditor(); switchView('posts'); });
    $('post-form').addEventListener('submit', savePost);
    $('refresh-posts').addEventListener('click', async () => {
      try { setGlobalStatus('جارٍ تحديث القائمة...'); await loadPosts(); setGlobalStatus('تم تحديث القائمة.', 'success'); }
      catch (e) { setGlobalStatus(e.message, 'error'); }
    });
    $('post-search').addEventListener('input', e => renderPosts(e.target.value));
    $('field-image').addEventListener('change', () => {
      const file = $('field-image').files[0];
      const preview = $('image-preview');
      if (!file) { preview.hidden = true; preview.innerHTML = ''; return; }
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${url}" alt="معاينة الصورة">`;
      preview.hidden = false;
    });

    $('posts-list').addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-index]');
      const del = event.target.closest('[data-delete-index]');
      if (edit) editPost(posts[Number(edit.dataset.editIndex)]);
      if (del) deletePost(posts[Number(del.dataset.deleteIndex)]);
    });

    if (getToken()) {
      $('login-view').hidden = true;
      $('admin-view').hidden = false;
      const cached = localStorage.getItem(USER_KEY);
      try { if (cached) $('user-name').textContent = JSON.parse(cached).login || OWNER; } catch (_) {}
      try {
        await finishLogin();
      } catch (_) {}
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
