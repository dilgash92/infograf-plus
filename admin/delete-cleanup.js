(() => {
  'use strict';

  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const $ = id => document.getElementById(id);

  function session(){return sessionStorage.getItem(SESSION_KEY)||'';}
  function headers(){return {Accept:'application/json','Content-Type':'application/json',...(session()?{Authorization:`Bearer ${session()}`}:{})};}

  async function api(path,options={}){
    const response=await fetch(`${API}${path}` ,{...options,headers:{...headers(),...(options.headers||{})}});
    let data=null;try{data=await response.json();}catch(_){}
    if(!response.ok)throw new Error(data?.message||data?.error||`حدث خطأ (${response.status})`);
    return data;
  }

  function decodeBase64(value){try{const binary=atob(String(value||'').replace(/\n/g,''));const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));return new TextDecoder('utf-8').decode(bytes);}catch(_){return '';}}

  function parseImagePath(markdown){
    const match=String(markdown||'').match(/^---\s*\n([\s\S]*?)\n---/);if(!match)return '';
    const line=match[1].split('\n').find(row=>/^image:\s*/.test(row));if(!line)return '';
    const value=line.replace(/^image:\s*/,'').trim().replace(/^['"]|['"]$/g,'');if(!value||/^https?:\/\//i.test(value))return '';
    const path=value.replace(/^\/+/,'');return path.startsWith('assets/uploads/')?path:'';
  }

  async function deleteImageIfUnused(imagePath, postPath, allPosts){
    if(!imagePath)return false;
    const stillUsed=allPosts.some(other=>other.path!==postPath&&other.imagePath===imagePath);
    if(stillUsed)return false;
    try{
      const file=await api(`/api/file?path=${encodeURIComponent(imagePath)}`);
      const sha=file?.sha||'';
      if(!sha)return false;
      await api('/api/file',{method:'DELETE',body:JSON.stringify({path:imagePath,sha,message:`Delete unused infographic image: ${imagePath.split('/').pop()}`})});
      return true;
    }catch(_){return false;}
  }

  async function handleDeleteClick(event){
    const button=event.target.closest('[data-delete-index]');if(!button)return;
    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    const index=Number(button.dataset.deleteIndex);if(!Number.isInteger(index))return;

    try{
      const data=await api('/api/posts');const files=Array.isArray(data)?data:[];const target=files[index];
      if(!target)throw new Error('تعذر العثور على الإنفوغرافيك المحدد. حدّث القائمة وحاول مجدداً.');
      const text=decodeBase64(target.content||'');
      const title=(text.match(/^title:\s*["']?(.+?)["']?\s*$/m)||[])[1]||target.path;
      const imagePath=parseImagePath(text);
      if(!window.confirm(imagePath?`هل أنت متأكد من حذف «${String(title).trim()}»؟\n\nسيُحذف ملف الإنفوغرافيك، وستُحذف الصورة أيضاً إذا لم تكن مستخدمة في إنفوغرافيك آخر.`:`هل أنت متأكد من حذف «${String(title).trim()}»؟\n\nسيُحذف ملف الإنفوغرافيك فقط.`))return;

      const allPosts=files.map(file=>({path:file.path,imagePath:parseImagePath(decodeBase64(file.content||''))}));
      $('global-status').textContent='جارٍ حذف الإنفوغرافيك...';$('global-status').className='status';$('global-status').hidden=false;
      await api('/api/file',{method:'DELETE',body:JSON.stringify({path:target.path,sha:target.sha,message:`Delete infographic: ${String(title).trim()}`})});
      const imageDeleted=await deleteImageIfUnused(imagePath,target.path,allPosts);
      $('global-status').textContent=imagePath&&imageDeleted?'تم حذف الإنفوغرافيك والصورة غير المستخدمة.':'تم حذف الإنفوغرافيك بنجاح.';
      $('global-status').className='status success';$('global-status').hidden=false;
      $('refresh-posts')?.click();
    }catch(error){
      $('global-status').textContent=error.message||'تعذر حذف الإنفوغرافيك.';
      $('global-status').className='status error';$('global-status').hidden=false;
    }
  }

  document.addEventListener('click',handleDeleteClick,true);
})();
