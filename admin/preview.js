(() => {
  'use strict';

  const $ = id => document.getElementById(id);

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
        const safe = escapeHtml(block.trim())
          .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
          .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
          .replace(/^#\s+(.+)$/gm, '<h2>$1</h2>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br>');
        return `<div class="preview-paragraph">${safe}</div>`;
      })
      .join('');
  }

  function currentImageUrl() {
    const file = $('field-image')?.files?.[0];
    if (file) return URL.createObjectURL(file);

    const text = $('current-image')?.textContent || '';
    const match = text.match(/الصورة الحالية:\s*(.+)$/);
    if (!match) return '';

    const path = match[1].trim();
    if (/^https?:\/\//i.test(path)) return path;
    return `/infograf-plus${path.startsWith('/') ? path : `/${path}`}`;
  }

  function openPreview() {
    const title = $('field-title')?.value.trim() || 'بدون عنوان';
    const category = $('field-category')?.value.trim() || '';
    const date = $('field-date')?.value || '';
    const source = $('field-source')?.value.trim() || '';
    const description = $('field-description')?.value.trim() || '';
    const alt = $('field-alt')?.value.trim() || title;
    const body = $('field-body-editor')?.value || '';
    const image = currentImageUrl();

    const modal = $('preview-modal');
    const content = $('preview-content');
    if (!modal || !content) return;

    const formattedDate = date
      ? new Intl.DateTimeFormat('ar-DE', { dateStyle: 'medium' }).format(new Date(date))
      : '';

    content.innerHTML = `
      <div class="preview-page">
        <header class="preview-header">
          ${category ? `<div class="preview-category">${escapeHtml(category)}</div>` : ''}
          <h1>${escapeHtml(title)}</h1>
          ${description ? `<p class="preview-description">${escapeHtml(description)}</p>` : ''}
          <div class="preview-meta">
            ${formattedDate ? `<span>${escapeHtml(formattedDate)}</span>` : ''}
            ${source ? `<span class="preview-separator">•</span><span>${escapeHtml(source)}</span>` : ''}
          </div>
        </header>

        ${image
          ? `<figure class="preview-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}"></figure>`
          : `<div class="preview-empty">لم تتم إضافة صورة بعد</div>`}

        ${source ? `<div class="preview-source"><span>المصدر</span><strong>${escapeHtml(source)}</strong></div>` : ''}
        ${body.trim() ? `<section class="preview-body">${markdownPreview(body)}</section>` : ''}
      </div>
    `;

    modal.hidden = false;
    document.body.classList.add('preview-open');
  }

  function closePreview() {
    const modal = $('preview-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('preview-open');
  }

  function ensurePreviewUI() {
    if ($('preview-modal')) return;

    const saveButton = $('save-post');
    if (saveButton) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'preview-post';
      button.className = 'button button-secondary button-wide';
      button.textContent = 'معاينة قبل النشر';
      saveButton.parentNode.insertBefore(button, saveButton);
      button.addEventListener('click', openPreview);
    }

    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'preview-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="preview-backdrop" data-preview-close></div>
      <div class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title">
        <div class="preview-toolbar">
          <div>
            <span class="eyebrow">معاينة</span>
            <h2 id="preview-dialog-title">معاينة الإنفوغرافيك</h2>
          </div>
          <button type="button" class="button button-secondary" id="close-preview">إغلاق</button>
        </div>
        <div id="preview-content" class="preview-content"></div>
      </div>
    `;
    document.body.appendChild(modal);

    $('close-preview')?.addEventListener('click', closePreview);
    modal.addEventListener('click', event => {
      if (event.target.matches('[data-preview-close]')) closePreview();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !$('preview-modal')?.hidden) closePreview();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensurePreviewUI();
    setTimeout(ensurePreviewUI, 500);
  });
})();
