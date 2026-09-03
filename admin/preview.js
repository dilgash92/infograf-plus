(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let objectUrl = '';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[ch]));
  }

  function markdownPreview(value) {
    const text = String(value || '').trim();
    if (!text) return '';

    return text
      .split(/\n{2,}/)
      .map(block => {
        let safe = escapeHtml(block.trim())
          .replace(/^###\s+(.+)$/gm, '<h4>$1</h4>')
          .replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
          .replace(/^#\s+(.+)$/gm, '<h3>$1</h3>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br>');
        return `<div class="preview-paragraph">${safe}</div>`;
      })
      .join('');
  }

  function currentImageUrl() {
    const file = $('field-image')?.files?.[0];
    if (file) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      return objectUrl;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = '';
    }

    const text = $('current-image')?.textContent || '';
    const match = text.match(/الصورة الحالية:\s*(.+)$/);
    if (!match) return '';

    const path = match[1].trim();
    if (/^https?:\/\//i.test(path)) return path;
    return `/infograf-plus${path.startsWith('/') ? path : `/${path}`}`;
  }

  function buildPreviewHtml() {
    const title = $('field-title')?.value.trim() || 'بدون عنوان';
    const category = $('field-category')?.value.trim() || '';
    const date = $('field-date')?.value || '';
    const source = $('field-source')?.value.trim() || '';
    const description = $('field-description')?.value.trim() || '';
    const alt = $('field-alt')?.value.trim() || title;
    const body = $('field-body-editor')?.value || '';
    const image = currentImageUrl();

    let formattedDate = '';
    if (date) {
      const parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) {
        formattedDate = new Intl.DateTimeFormat('ar-DE', { dateStyle: 'medium' }).format(parsed);
      }
    }

    return `
      <div class="preview-page">
        <div class="preview-sitebar">
          <span class="preview-logo">Infograf<span>+</span></span>
          <span class="preview-sitebar-label">صفحة الإنفوغرافيك</span>
        </div>

        <header class="preview-header">
          ${category ? `<div class="preview-category">${escapeHtml(category)}</div>` : ''}
          <h1>${escapeHtml(title)}</h1>
          ${description ? `<p class="preview-description">${escapeHtml(description)}</p>` : ''}
          ${(formattedDate || source) ? `<div class="preview-meta">
            ${formattedDate ? `<span>${escapeHtml(formattedDate)}</span>` : ''}
            ${formattedDate && source ? '<span class="preview-separator">•</span>' : ''}
            ${source ? `<span>${escapeHtml(source)}</span>` : ''}
          </div>` : ''}
        </header>

        ${image
          ? `<figure class="preview-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" draggable="false"></figure>`
          : `<div class="preview-empty">لم تتم إضافة صورة بعد</div>`}

        ${source ? `<div class="preview-source"><span>المصدر</span><strong>${escapeHtml(source)}</strong></div>` : ''}
        ${body.trim() ? `<section class="preview-body">${markdownPreview(body)}</section>` : ''}
      </div>
    `;
  }

  function refreshPreview() {
    const content = $('preview-content');
    if (content) content.innerHTML = buildPreviewHtml();
  }

  function setupPhonePreview() {
    if ($('preview-panel')) return;

    const editorView = $('editor-view');
    const form = $('post-form');
    if (!editorView || !form) return;

    editorView.classList.add('editor-with-preview');

    const previewPanel = document.createElement('aside');
    previewPanel.id = 'preview-panel';
    previewPanel.className = 'preview-panel';
    previewPanel.innerHTML = `
      <div class="preview-panel-heading">
        <div>
          <p class="eyebrow">معاينة حية</p>
          <h2>كيف سيظهر للزائر</h2>
        </div>
        <span class="preview-live-badge">مباشر</span>
      </div>
      <div class="preview-phone-wrap">
        <div class="preview-phone" aria-label="معاينة صفحة الإنفوغرافيك على الهاتف">
          <div class="preview-phone-speaker" aria-hidden="true"></div>
          <div id="preview-content" class="preview-content"></div>
        </div>
      </div>
    `;

    editorView.appendChild(previewPanel);

    const previewInputs = [
      'field-title',
      'field-description',
      'field-body-editor',
      'field-source',
      'field-category',
      'field-date',
      'field-alt',
      'field-image'
    ];

    previewInputs.forEach(id => {
      const field = $(id);
      if (!field) return;
      field.addEventListener('input', refreshPreview);
      field.addEventListener('change', refreshPreview);
    });

    const currentImage = $('current-image');
    if (currentImage) {
      const observer = new MutationObserver(refreshPreview);
      observer.observe(currentImage, {childList:true, characterData:true, subtree:true});
    }

    refreshPreview();
  }

  function addPreviewButton() {
    if ($('preview-post')) return;
    const saveButton = $('save-post');
    if (!saveButton) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'preview-post';
    button.className = 'button button-secondary button-wide';
    button.textContent = 'تحديث المعاينة';
    button.addEventListener('click', () => {
      refreshPreview();
      $('preview-panel')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
    saveButton.parentNode.insertBefore(button, saveButton);
  }

  function loadCategoryManager() {
    if (document.querySelector('script[data-category-manager]')) return;
    const script = document.createElement('script');
    script.src = '/infograf-plus/admin/categories-manager.js';
    script.defer = true;
    script.dataset.categoryManager = '1';
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPhonePreview();
    addPreviewButton();
    loadCategoryManager();
    setTimeout(() => {
      setupPhonePreview();
      addPreviewButton();
      refreshPreview();
      loadCategoryManager();
    }, 500);
  });
})();
