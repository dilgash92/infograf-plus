(() => {
  'use strict';

  const SITE_BASE = '/infograf-plus';
  const DEFAULT_CATEGORIES = [
    'العالم',
    'سياسة',
    'اقتصاد ومال',
    'تقنية',
    'علوم',
    'صحة',
    'رياضة',
    'ترفيه',
    'سيارات',
    'سفر',
    'تعليم',
    'تاريخ',
    'مجتمع',
    'فن وثقافة',
    'طبيعة وبيئة',
    'منوع'
  ];

  const select = document.getElementById('field-category');
  if (!select) return;

  const previousValue = select.value;
  select.innerHTML = '<option value="">جاري تحميل الأقسام...</option>';
  select.disabled = true;

  function populate(categories) {
    const clean = [...new Set((Array.isArray(categories) ? categories : [])
      .map(value => String(value || '').trim())
      .filter(Boolean))];

    const values = clean.length ? clean : DEFAULT_CATEGORIES;
    select.innerHTML = '<option value="">اختر القسم</option>' + values
      .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join('');

    select.disabled = false;
    if (values.includes(previousValue)) select.value = previousValue;
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

  fetch(`${SITE_BASE}/categories.json`, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`categories.json: ${response.status}`);
      return response.json();
    })
    .then(data => populate(data?.categories))
    .catch(() => populate(DEFAULT_CATEGORIES));
})();
