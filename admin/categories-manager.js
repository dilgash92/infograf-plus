(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SITE_BASE = '/infograf-plus';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const FALLBACK = [
    'العالم','سياسة','اقتصاد ومال','تقنية','علوم','صحة','رياضة','ترفيه',
    'سيارات','سفر','تعليم','تاريخ','مجتمع','فن وثقافة','طبيعة وبيئة','منوع'
  ];

  const $ = id => document.getElementById(id);
  let categories = [];
  let loaded = false;

  function session() {
    return sessionStorage.getItem(SESSION_KEY) || '';
  }

  function headers() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(session() ? { Authorization: `Bearer ${session()}` } : {})
    };
  }

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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[ch]));
  }

  function base64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function injectStyles() {
    if ($('categories-manager-styles')) return;
    const style = document.createElement('style');
    style.id = 'categories-manager-styles';
    style.textContent = `
      .category-manager-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin:20px 0}
      .category-manager-list{display:grid;gap:10px;margin-top:14px}
      .category-manager-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;background:#f8fafc}
      .category-manager-row strong{display:block}.category-manager-row small{display:block;margin-top:4px;color:#94a3b8;font-size:11px}
      @media(max-width:600px){.category-manager-add{grid-template-columns:1fr}.category-manager-add .button{width:100%}.category-manager-row{align-items:flex-start}}
    `;
    document.head.appendChild(style);
  }

  async function loadCategories() {
    try {
      const response = await fetch(`${SITE_BASE}/categories.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error('تعذر تحميل الأقسام.');
      const data = await response.json();
      categories = clean(data?.categories);
    } catch (_) {
      categories = [...FALLBACK];
    }
    loaded = true;
    render();
    refreshEditorSelect();
  }

  function clean(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(v => String(v || '').trim())
      .filter(Boolean))];
  }

  function refreshEditorSelect() {
    const select = $('field-category');
    if (!select || !categories.length) return;
    const selected = select.value;
    select.innerHTML = '<option value="">اختر القسم</option>' + categories
      .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join('');
    if (categories.includes(selected)) select.value = selected;
  }

  async function saveCategories(next, successMessage) {
    const cleanNext = clean(next);
    if (!cleanNext.length) throw new Error('يجب أن يبقى قسم واحد على الأقل.');
    const content = JSON.stringify({ categories: cleanNext }, null, 2) + '\n';
    await api('/api/file', {
      method: 'PUT',
      body: JSON.stringify({
        path: 'categories.json',
        content: base64(content),
        message: 'Update infographic categories'
      })
    });
    categories = cleanNext;
    render();
    refreshEditorSelect();
    setStatus(successMessage, 'success');
  }

  function setStatus(message, type = '') {
    const box = $('categories-manager-status');
    if (!box) return;
    box.textContent = message;
    box.className = `status${type ? ` ${type}` : ''}`;
    box.hidden = false;
  }

  function render() {
    const list = $('categories-manager-list');
    const count = $('categories-manager-count');
    if (!list) return;
    if (count) count.textContent = `${categories.length} قسم`;
    if (!categories.length) {
      list.innerHTML = '<div class="empty-admin">لا توجد أقسام.</div>';
      return;
    }
    list.innerHTML = categories.map((category, index) => `
      <div class="category-manager-row">
        <div>
          <strong>${escapeHtml(category)}</strong>
          <small>القسم رقم ${index + 1}</small>
        </div>
        <button class="button button-danger" type="button" data-delete-category="${escapeHtml(category)}">حذف</button>
      </div>
    `).join('');
  }

  function injectUI() {
    if ($('categories-manager-view')) return;

    const nav = document.querySelector('.sidebar-nav');
    if (nav && !nav.querySelector('[data-view="categories-manager"]')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.type = 'button';
      button.dataset.view = 'categories-manager';
      button.textContent = 'الأقسام';
      nav.appendChild(button);
      button.addEventListener('click', () => showView());
    }

    const main = document.querySelector('.main-area');
    if (!main) return;

    const section = document.createElement('section');
    section.id = 'categories-manager-view';
    section.className = 'view';
    section.hidden = true;
    section.innerHTML = `
      <div class="section-card">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">تنظيم المحتوى</p>
            <h2>إدارة الأقسام</h2>
          </div>
          <span id="categories-manager-count" class="role-badge">0 قسم</span>
        </div>
        <p class="muted">أضف أو احذف الأقسام التي تظهر في محرر الإنفوغرافيك. الإنفوغرافيكات المنشورة لا تتغير عند حذف قسم.</p>
        <div class="category-manager-add">
          <label>اسم القسم<input id="new-category-name" type="text" maxlength="60" placeholder="مثال: اقتصاد ومال" autocomplete="off"></label>
          <button id="add-category-button" class="button button-primary" type="button">+ إضافة قسم</button>
        </div>
        <div id="categories-manager-status" class="status" hidden></div>
        <div id="categories-manager-list" class="category-manager-list"></div>
      </div>
    `;
    main.appendChild(section);

    $('add-category-button')?.addEventListener('click', addCategory);
    $('new-category-name')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') addCategory();
    });
    $('categories-manager-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-delete-category]');
      if (button) deleteCategory(button.dataset.deleteCategory);
    });
  }

  function showView() {
    document.querySelectorAll('.view').forEach(section => {
      section.hidden = section.id !== 'categories-manager-view';
    });
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === 'categories-manager');
    });
    const heading = $('page-heading');
    if (heading) heading.textContent = 'الأقسام';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }

  async function addCategory() {
    const input = $('new-category-name');
    const name = input?.value.trim() || '';
    if (!name) return;
    if (categories.includes(name)) {
      setStatus('هذا القسم موجود مسبقاً.', 'error');
      return;
    }
    const button = $('add-category-button');
    if (button) button.disabled = true;
    try {
      await saveCategories([...categories, name], 'تمت إضافة القسم بنجاح.');
      if (input) input.value = '';
    } catch (error) {
      setStatus(error.message || 'تعذر إضافة القسم.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function deleteCategory(name) {
    if (categories.length <= 1) {
      setStatus('لا يمكن حذف آخر قسم.', 'error');
      return;
    }
    if (!window.confirm(`هل تريد حذف قسم «${name}»؟\n\nالإنفوغرافيكات الحالية التي تحمل هذا القسم لن تتغير، لكن القسم لن يظهر للاختيار في الإنفوغرافيكات الجديدة.`)) return;
    try {
      await saveCategories(categories.filter(category => category !== name), 'تم حذف القسم بنجاح.');
    } catch (error) {
      setStatus(error.message || 'تعذر حذف القسم.', 'error');
    }
  }

  function boot() {
    if (!session()) return;
    injectStyles();
    injectUI();
    loadCategories();
    setTimeout(() => {
      if (!loaded) loadCategories();
    }, 800);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
