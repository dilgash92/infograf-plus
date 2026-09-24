(() => {
  'use strict';
  const RAW = 'https://raw.githubusercontent.com/dilgash92/infograf-plus/main/';
  const INDEX = '/admin-data.json';
  const originalFetch = window.fetch.bind(window);
  let cached = null;
  let loading = null;
  let bypassCount = 0;

  function rawUrl(path) {
    return RAW + String(path).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  }
  function base64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }
  async function gitBlobSha(text) {
    const bytes = new TextEncoder().encode(text);
    const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const all = new Uint8Array(header.length + bytes.length);
    all.set(header); all.set(bytes, header.length);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', all));
    return [...hash].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function load() {
    if (cached) return cached;
    if (loading) return loading;
    loading = (async () => {
      const response = await originalFetch(`${INDEX}?ts=${Date.now()}`, {cache:'no-store'});
      if (!response.ok) throw new Error('تعذر تحميل فهرس الإنفوغرافيكات.');
      const index = await response.json();
      const list = Array.isArray(index?.posts) ? index.posts : [];
      return Promise.all(list.map(async item => {
        const file = await originalFetch(rawUrl(item.path), {cache:'no-store'});
        if (!file.ok) throw new Error(`تعذر تحميل ${item.path}`);
        const text = await file.text();
        return {path:item.path, sha:await gitBlobSha(text), content:base64(text)};
      }));
    })();
    try { cached = await loading; return cached; } finally { loading = null; }
  }
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || (typeof input !== 'string' ? input?.method : 'GET') || 'GET').toUpperCase();
    if (method === 'GET' && /\/api\/posts(?:\?|$)/.test(url) && bypassCount > 0) {
      bypassCount--;
      return originalFetch(input, init);
    }
    if (method === 'GET' && /\/api\/posts(?:\?|$)/.test(url)) {
      try {
        const data = await load();
        return new Response(JSON.stringify(data), {status:200, headers:{'Content-Type':'application/json'}});
      } catch (error) {
        return new Response(JSON.stringify({error:'index_error',message:error.message}), {status:503, headers:{'Content-Type':'application/json'}});
      }
    }
    const response = await originalFetch(input, init);
    if (/\/api\/file(?:\?|$)/.test(url) && method !== 'GET' && response.ok) {
      cached = null;
      loading = null;
      bypassCount = 3;
    }
    return response;
  };
})();