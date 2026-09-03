(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';

  const $ = id => document.getElementById(id);

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

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `حدث خطأ (${response.status})`);
    }

    return data;
  }

  function decodeBase64(value) {
    try {
      const binary = atob(String(value || '').replace(/\n/g, ''));
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch (_) {
      return '';
    }
  }

  function parseImagePath(markdown) {
    const match = String(markdown || '').match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return '';

    const line = match[1].split('\n').find(row => /^image:\s*/.test(row));
    if (!line) return '';

    const value = line.replace(/^image:\s*/, '').trim().replace(/^['"]|['"]$/g, '');
    if (!value || /^https?:\/\//i.test(value)) return '';

    const path = value.replace(/^\/+/, '');
    return path.startsWith('assets/uploads/') ? path : '';
  }

  function setStatus(message, type = '') {
    const target = $('global-status');
    if (!target) return;
    target.textContent = message;
    target.className = `status${type ? ` ${type}` : ''}`;
    target.hidden = false;
  }

  async function deletePostAndUnusedImage(post) {
    const title = post.title || 'هذا الإنفوغرافيك';
    const imagePath = post.imagePath || '';

    const confirmation = imagePath
      ? `هل أنت متأكد من حذف «${title}»؟\n\nسيُحذف ملف الإنفوغرافيك، وستُحذف الصورة أيضاً إذا لم تكن مستخدمة في إنفوغرافيك آخر.`
      : `هل أنت متأكد من حذف «${title}»؟\n\nسيُحذف ملف الإنفوغرافيك فقط.`;

    if (!window.confirm(confirmation)) return;

    try {
      setStatus('جارٍ حذف الإنفوغرافيك...');

      await api('/api/file', {
        method: 'DELETE',
        body: JSON.stringify({
          path: post.path,
          sha: post.sha,
          message: `Delete infographic: ${title}`
        })
      });

      let imageDeleted = false;
      let imageStillUsed = false;

      if (imagePath) {
        imageStillUsed = post.allPosts.some(other =>
          other.path !== post.path && other.imagePath === imagePath
        );

        if (!imageStillUsed) {
          try {
            await api('/api/file', {
              method: 'DELETE',
              body: JSON.stringify({
                path: imagePath,
                message: `Delete unused infographic image: ${imagePath.split('/').pop()}`
              })
            });
            imageDeleted = true;
          } catch (_) {
            // The post is already deleted. Keep the orphaned image rather than
            // risking an additional failure or destructive retry.
          }
        }
      }

      if (imageStillUsed) {
        setStatus('تم حذف الإنفوغرافيك. الصورة ما زالت مستخدمة في إنفوغرافيك آخر.', 'success');
      } else if (imageDeleted) {
        setStatus('تم حذف الإنفوغرافيك والصورة غير المستخدمة.', 'success');
      } else if (imagePath) {
        setStatus('تم حذف الإنفوغرافيك، لكن تعذّر حذف الصورة القديمة. يمكنك تنظيفها لاحقاً.', '');
      } else {
        setStatus('تم حذف الإنفوغرافيك بنجاح.', 'success');
      }

      $('refresh-posts')?.click();
    } catch (error) {
      setStatus(error.message || 'تعذر حذف الإنفوغرافيك.', 'error');
    }
  }

  async function handleDeleteClick(event) {
    const button = event.target.closest('[data-delete-index]');
    if (!button) return;

    // Stop the original app.js delete handler so this cleanup-aware flow
    // becomes the single deletion path.
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    const index = Number(button.dataset.deleteIndex);
    if (!Number.isInteger(index)) return;

    try {
      const data = await api('/api/posts');
      const files = Array.isArray(data) ? data : [];
      const targetFile = files[index];
      if (!targetFile) throw new Error('تعذر العثور على الإنفوغرافيك المحدد. حدّث القائمة وحاول مجدداً.');

      const targetText = decodeBase64(targetFile.content || '');
      const targetTitle = (targetText.match(/^title:\s*["']?(.+?)["']?\s*$/m) || [])[1] || targetFile.path;
      const targetImage = parseImagePath(targetText);

      const allPosts = files.map(file => ({
        path: file.path,
        sha: file.sha,
        title: file.path,
        imagePath: parseImagePath(decodeBase64(file.content || ''))
      }));

      await deletePostAndUnusedImage({
        path: targetFile.path,
        sha: targetFile.sha,
        title: String(targetTitle).trim(),
        imagePath: targetImage,
        allPosts
      });
    } catch (error) {
      setStatus(error.message || 'تعذر تحميل بيانات الحذف.', 'error');
    }
  }

  document.addEventListener('click', handleDeleteClick, true);
})();
