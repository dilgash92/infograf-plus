(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const GITHUB_CONTENTS = 'https://api.github.com/repos/dilgash92/infograf-plus/contents/';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const $ = id => document.getElementById(id);
  let objectUrl = '';
  let pendingOldImage = '';
  let cleanupRunning = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[ch]));
  }

  function markdownPreview(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.split(/\n{2,}/).map(block => {
      const safe = escapeHtml(block.trim())
        .replace(/^###\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^#\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      return `<div class="preview-paragraph">${safe}</div>`;
    }).join('');
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
    return path.startsWith('/') ? path : `/${path}`;
  }

  function buildPreviewHtml() {
    const title = $('field-title')?.value.trim() || 'بدون عنوان';
    const category = $('field-category')?.value.trim() || '';
    const slug = $('field-slug')?.value.trim() || '';
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
          ${slug ? `<div class="preview-slug">/i/${escapeHtml(slug)}/</div>` : ''}
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
      </div>`;
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
        <div><p class="eyebrow">معاينة حية</p><h2>كيف سيظهر للزائر</h2></div>
        <span class="preview-live-badge">مباشر</span>
      </div>
      <div class="preview-phone-wrap">
        <div class="preview-phone" aria-label="معاينة صفحة الإنفوغرافيك على الهاتف">
          <div class="preview-phone-speaker" aria-hidden="true"></div>
          <div id="preview-content" class="preview-content"></div>
        </div>
      </div>`;

    editorView.appendChild(previewPanel);

    ['field-title','field-slug','field-description','field-body-editor','field-source','field-category','field-date','field-alt','field-image'].forEach(id => {
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

  function cleanImagePath(value) {
    const path = String(value || '').trim();
    if (!path || /^https?:\/\//i.test(path)) return '';
    return path.startsWith('/') ? path : `/${path}`;
  }

  function githubPath(path) {
    return path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  }

  function parsePostImage(text) {
    const match = String(text || '').match(/^image:\s*(.*)$/m);
    if (!match) return '';
    const value = match[1].trim();
    try { return cleanImagePath(JSON.parse(value)); } catch (_) {}
    return cleanImagePath(value.replace(/^['"]|['"]$/g, ''));
  }

  function decodeUtf8Base64(value) {
    try {
      const binary = atob(String(value || '').replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_) { return ''; }
  }

  async function getPosts() {
    const session = sessionStorage.getItem(SESSION_KEY) || '';
    const response = await fetch(`${API}/api/posts`, {
      headers: {Accept:'application/json', ...(session ? {Authorization:`Bearer ${session}`} : {})}
    });
    if (!response.ok) throw new Error('تعذر التحقق من استخدام الصورة.');
    return Array.isArray(await response.json()) ? await (async () => {
      const data = await fetch(`${API}/api/posts`, {headers:{Accept:'application/json', ...(session ? {Authorization:`Bearer ${session}`} : {})}});
      return data.ok ? data.json() : [];
    })() : [];
  }

  async function imageStillUsed(path) {
    const target = cleanImagePath(path);
    if (!target) return true;
    const session = sessionStorage.getItem(SESSION_KEY) || '';
    const response = await fetch(`${API}/api/posts`, {
      headers: {Accept:'application/json', ...(session ? {Authorization:`Bearer ${session}`} : {})}
    });
    if (!response.ok) return true;
    const files = await response.json();
    for (const file of Array.isArray(files) ? files : []) {
      const text = decodeUtf8Base64(file.content || '');
      if (parsePostImage(text) === target) return true;
    }
    return false;
  }

  async function deleteImage(path) {
    const target = cleanImagePath(path);
    if (!target || !target.startsWith('/assets/uploads/')) return;
    if (await imageStillUsed(target)) return;

    const response = await fetch(`${GITHUB_CONTENTS}${githubPath(target)}?ref=main`, {
      headers:{Accept:'application/vnd.github+json'}
    });
    if (response.status === 404) return;
    if (!response.ok) throw new Error('تعذر العثور على ملف الصورة القديمة.');
    const meta = await response.json();
    const session = sessionStorage.getItem(SESSION_KEY) || '';
    const deleteResponse = await fetch(`${API}/api/file`, {
      method:'DELETE',
      headers:{Accept:'application/json','Content-Type':'application/json',...(session ? {Authorization:`Bearer ${session}`} : {})},
      body:JSON.stringify({path:target,sha:meta.sha,message:`Delete unused infographic image: ${target.split('/').pop()}`})
    });
    if (!deleteResponse.ok) {
      let data=null; try { data=await deleteResponse.json(); } catch (_) {}
      throw new Error(data?.message || data?.error || 'تعذر حذف الصورة القديمة.');
    }
  }

  async function cleanupReplacedImage() {
    const oldImage = pendingOldImage;
    pendingOldImage = '';
    if (!oldImage || cleanupRunning) return;
    cleanupRunning = true;
    try {
      await deleteImage(oldImage);
    } catch (error) {
      console.warn('Infograf+ image cleanup:', error);
    } finally {
      cleanupRunning = false;
    }
  }

  function watchSuccessfulUpdate() {
    const status = $('global-status');
    if (!status) return;
    const observer = new MutationObserver(() => {
      const text = status.textContent || '';
      if (text.includes('تم حفظ التعديلات بنجاح')) {
        cleanupReplacedImage();
      }
    });
    observer.observe(status, {childList:true, characterData:true, subtree:true});
  }

  function captureOldImageBeforeSubmit() {
    const form = $('post-form');
    if (!form) return;
    form.addEventListener('submit', () => {
      const current = cleanImagePath(($('current-image')?.textContent || '').replace(/^الصورة الحالية:\s*/, ''));
      const newFile = $('field-image')?.files?.[0];
      pendingOldImage = newFile && current ? current : '';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPhonePreview();
    addPreviewButton();
    captureOldImageBeforeSubmit();
    watchSuccessfulUpdate();
    setTimeout(() => {
      setupPhonePreview();
      addPreviewButton();
      captureOldImageBeforeSubmit();
      refreshPreview();
    }, 500);
  });
})();