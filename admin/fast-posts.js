(() => {
  'use strict';
  const RAW = 'https://raw.githubusercontent.com/dilgash92/infograf-plus/main/';
  const INDEX = '/admin-data.json';
  const originalFetch = window.fetch.bind(window);
  let cached = null, loading = null, bypassCount = 0;
  const contentCache = new Map();
  const rawUrl = path => RAW + String(path).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  const base64 = text => { const bytes=new TextEncoder().encode(text); let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); return btoa(binary); };
  async function gitBlobSha(text){ const bytes=new TextEncoder().encode(text); const header=new TextEncoder().encode('blob '+bytes.length+'\0'); const all=new Uint8Array(header.length+bytes.length); all.set(header); all.set(bytes,header.length); const hash=new Uint8Array(await crypto.subtle.digest('SHA-1',all)); return [...hash].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  async function loadIndex(){
    if(cached) return cached; if(loading) return loading;
    loading=(async()=>{ const response=await originalFetch(INDEX+'?ts='+Date.now(),{cache:'no-store'}); if(!response.ok) throw new Error('تعذر تحميل فهرس الإنفوغرافيكات.'); const index=await response.json();
      return (Array.isArray(index?.posts)?index.posts:[]).map(item=>({path:item.path,sha:null,data:{title:item.title||'',date:item.date||'',slug:item.slug||'',category:item.category||'',description:item.description||'',source:item.source||'',image:item.image||'',image_alt:item.image_alt||'',featured:item.featured===true},body:''}));
    })();
    try{cached=await loading;return cached}finally{loading=null}
  }
  async function getPost(path){
    const key=String(path||''); if(!key) throw new Error('مسار الإنفوغرافيك غير صالح.');
    if(contentCache.has(key)) return contentCache.get(key);
    const promise=(async()=>{ const response=await originalFetch(rawUrl(key),{cache:'no-store'}); if(!response.ok) throw new Error('تعذر تحميل الإنفوغرافيك.'); const text=await response.text(); return {path:key,sha:await gitBlobSha(text),text,content:base64(text)}; })();
    contentCache.set(key,promise); try{return await promise}catch(error){contentCache.delete(key);throw error}
  }
  function invalidate(){cached=null;loading=null;contentCache.clear();bypassCount=2}
  window.InfografFast={loadIndex,getPost,invalidate};
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url||''; const method=String(init?.method||(typeof input!=='string'?input?.method:'GET')||'GET').toUpperCase();
    if(method==='GET'&&/\/api\/posts(?:\?|$)/.test(url)&&bypassCount>0){bypassCount--;return originalFetch(input,init)}
    if(method==='GET'&&/\/api\/posts(?:\?|$)/.test(url)){try{return new Response(JSON.stringify(await loadIndex()),{status:200,headers:{'Content-Type':'application/json'}})}catch(error){return new Response(JSON.stringify({error:'index_error',message:error.message}),{status:503,headers:{'Content-Type':'application/json'}})}}
    const response=await originalFetch(input,init); if(/\/api\/file(?:\?|$)/.test(url)&&method!=='GET'&&response.ok) invalidate(); return response;
  };
})();