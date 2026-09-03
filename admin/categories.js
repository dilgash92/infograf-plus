(() => {
  'use strict';

  const SITE_BASE = '/infograf-plus';
  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const CATEGORIES_PATH = 'categories.json';

  const DEFAULT_CATEGORIES = [
    'العالم', 'سياسة', 'اقتصاد ومال', 'تقنية', 'علوم', 'صحة', 'رياضة', 'ترفيه',
    'سيارات', 'سفر', 'تعليم', 'تاريخ', 'مجتمع', 'فن وثقافة', 'طبيعة وبيئة', 'منوع'
  ];

  const $ = id => document.getElementById(id);
  let categories = [];
  let categorySha = '';
  let loadedFromRepo = false;

  function session() {
    return sessionStorage.getItem(SESSION_KEY) || '';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  function base64FromText(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  async function workerWrite(payload) {
    const response = await fetch(`${API}/api/file`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(session() ? { Authorization: `Bearer ${session()}` } : {})
      },
      body: JSON.stringify(payload)
    });
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data?.message || data?.error || `تعذر حفظ الأقسام (${response.status})`);
    return data;
  }

  async function fetchCategoryFile() {
    const response = await fetch(`https://api.github.com/repos/dilgash92/infograf-plus/contents/${CATEGORIES_PATH}?ref=main`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`تعذر قراءة categories.json (${response.status})`);
    const data = await response.json();
    categorySha = data.sha || '';
    const decoded = atob(String(data.content || '').replace(/\n/g, ''));
    const parsed = JSON.parse(new TextDecoder('utf-8').decode(Uint8Array.from(decoded, ch => ch.charCodeAt(0))));
    categories = normalizeCategories(parsed?.categories);
    loadedFromRepo = true;
    return categories;
  }

  function normalizeCategories(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean))];
  }

  function categoryOptions(selected = '') {
    const values = categories.length ? categories : DEFAULT_CATEGORIES;
    return '<option value="">اختر القسم</option>' + values.map(category =>
      `<option value="${escapeHtml(category)}"${category === selected ? ' selected' : ''}>${escapeHtml(category)}</option>`
    ).join('');
  }

  function populateSelect(selected = '') {
    const select = $('field-category');
    if (!select) return;
    select.innerHTML = categoryOptions(selected);
    select.disabled = false;
  }

  function showMessage(message, type = '') {
    const target = $('categories-status');
    if (!target) return;
    target.textContent = message;
    target.className = `status${type ? ` ${type}` : ''}`;
    target.hidden = false;
  }

  function renderManager() {
    const list = $('categories-list');
    const count = $('categories-count');
    if (!list) return;
    count.textContent = `${categories.length} قسم`;
    list.innerHTML = categories.map(category => `
      <div class="category-row">
        <div>
          <strong>${escapeHtml(category)}</strong>
          <small>اسم القسم</small>
        </div>
        <button type="button" class="button button-danger" data-delete-category="${escapeHtml(category)}">حذف</button>
      </div>
    `).join('');
  }

  function ensureUI() {
    if ($('categories-view')) return;

    const nav = document.querySelector('.sidebar-nav');
    if (nav) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-item';
      button.dataset.view = 'categories';
      button.textContent = 'الأقسام';
      nav.appendChild(button);
      button.addEventListener('click', () => switchToCategories());
    }

    const main = document.querySelector('.main-area');
    const admins = $('admins-view');
    if (!main || !admins) return;

    admins.insertAdjacentHTML('afterend', `
      <section id="categories-view" class="view" hidden>
        <div class="section-card">
          <div class="section-title-row">
            <div><p class="eyebrow">تنظيم المحتوى</p><h2>إدارة الأقسام</h2></div>
            <span id="categories-count" class="role-badge">—</span>
          </div>
          <p class="muted">أضف أقساماً جديدة أو احذف قسماً غير مستخدم. التغييرات تحفظ في ملف واحد صغير، لذلك لا تؤثر على سرعة صفحات الزوار.</p>
          <div class="admin-add-row">
            <label>اسم القسم<input id="new-category-input" type="text" maxlength="60" placeholder="مثال: جغرافيا" autocomplete="off"></label>
            <button id="add-category-button" class="button button-primary" type="button">إضافة قسم</button>
          </div>
          <div id="categories-status" class="status" hidden></div>
          <div id="categories-list" class="categories-list"></div>
        </div>
      </section>
    `);

    $('add-category-button')?.addEventListener('click', addCategory);
    $('new-category-input')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') addCategory();
    });
    $('categories-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-delete-category]');
      if (button) deleteCategory(button.dataset.deleteCategory);
    });
  }

  function switchToCategories() {
    document.querySelectorAll('.view').forEach(section => {
      section.hidden = section.id !== 'categories-view';
    });
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      button.classList.toggle('active', button.dataset.view === 'categories');
    });
    const heading = $('page-heading');
    if (heading) heading.textContent = 'إدارة الأقسام';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderManager();
  }

  async function saveCategories(next) {
    const clean = normalizeCategories(next);
    if (!clean.length) throw new Error('يجب أن يبقى قسم واحد على الأقل.');

    const payload = {
      path: CATEGORIES_PATH,
      sha: categorySha || undefined,
      content: base64FromText(JSON.stringify({ categories: clean }, null, 2) + '\n'),
      message: 'Update infographic categories'
    };

    await workerWrite(payload);
    categories = clean;
    await fetchCategoryFile();
    populateSelect($('field-category')?.value || '');
    renderManager();
  }

  async function addCategory() {
    const input = $('new-category-input');
    const value = input?.value.trim() || '';
    if (!value) return;
    if (categories.some(category => category.localeCompare(value, 'ar', { sensitivity: 'base' }) === 0)) {
      showMessage('هذا القسم موجود مسبقاً.', 'error');
      return;
    }

    const button = $('add-category-button');
    button.disabled = true;
    try {
      await saveCategories([...categories, value]);
      input.value = '';
      showMessage('تمت إضافة القسم بنجاح.', 'success');
    } catch (error) {
      showMessage(error.message || 'تعذر إضافة القسم.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function deleteCategory(category) {
    if (categories.length <= 1) {
      showMessage('لا يمكن حذف آخر قسم.', 'error');
      return;
    }
    const confirmed = window.confirm(`هل تريد حذف قسم «${category}»؟\n\nلن يتم حذف أي إنفوغرافيك، لكن لا يمكن اختيار هذا القسم لمنشورات جديدة بعد الحذف.`);
    if (!confirmed) return;

    try {
      await saveCategories(categories.filter(item => item !== category));
      showMessage('تم حذف القسم بنجاح.', 'success');
    } catch (error) {
      showMessage(error.message || 'تعذر حذف القسم.', 'error');
    }
  }

  async function init() {
    ensureUI();
    const select = $('field-category');
    if (select) {
      select.disabled = true;
      select.innerHTML = '<option value="">جاري تحميل الأقسام...</option>';
    }

    try {
      await fetchCategoryFile();
    } catch (_) {
      categories = DEFAULT_CATEGORIES.slice();
      loadedFromRepo = false;
    }

    populateSelect(select?.value || '');
    renderManager();

    if (!loadedFromRepo) {
      const status = $('categories-status');
      if (status) {
        status.textContent = 'تم تحميل قائمة احتياطية. قد تحتاج إعادة تحميل الصفحة إذا كان ملف الأقسام غير متاح مؤقتاً.';
        status.className = 'status';
        status.hidden = false;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
