(() => {
  'use strict';
  const API='https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY='infograf_plus_admin_session';
  const $=id=>document.getElementById(id);
  const session=()=>sessionStorage.getItem(SESSION_KEY)||'';
  async function api(path,options={}){const response=await fetch(API+path,{...options,headers:{Accept:'application/json','Content-Type':'application/json',Authorization:'Bearer '+session(),...(options.headers||{})}});let data=null;try{data=await response.json()}catch(_){}if(!response.ok)throw new Error(data?.message||data?.error||'حدث خطأ');return data;}
  function decorateRows(){
    document.querySelectorAll('#posts-list .post-row').forEach(row=>{
      if(row.querySelector('[data-feature-path]'))return;
      const edit=row.querySelector('[data-edit-path]'),remove=row.querySelector('[data-delete-path]'); if(!edit||!remove)return;
      const path=decodeURIComponent(edit.dataset.editPath||''),post=window.__infografPosts?.find(item=>item.path===path); if(!post)return;
      const marked=post.data.featured===true; row.dataset.featured=marked?'true':'false';
      if(marked){const title=row.querySelector('.post-info strong');if(title&&!title.nextElementSibling?.classList.contains('featured-badge')){const badge=document.createElement('span');badge.className='featured-badge';badge.textContent='★ مميز';title.insertAdjacentElement('afterend',badge);}}
      const button=document.createElement('button');button.type='button';button.className='button '+(marked?'button-primary':'button-secondary');button.dataset.featurePath=encodeURIComponent(post.path);button.textContent=marked?'إلغاء التمييز':'تمييز';remove.insertAdjacentElement('beforebegin',button);
    });
  }
  async function toggleFeatured(path,button){
    if(button)button.disabled=true;
    try{const post=window.__infografPosts?.find(item=>item.path===path);if(!post)throw new Error('تعذر العثور على الإنفوغرافيك.');const full=await window.InfografFast.getPost(post.path);let text=full.text||'';const enabled=!/^featured:\s*true\s*$/mi.test(text);const line='featured: '+(enabled?'true':'false');const updated=/^featured:\s*(?:true|false)\s*$/mi.test(text)?text.replace(/^featured:\s*(?:true|false)\s*$/mi,line):text.replace(/^---\s*\n/,'---\n'+line+'\n');
      const bytes=new TextEncoder().encode(updated);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
      await api('/api/file',{method:'PUT',body:JSON.stringify({path:post.path,sha:full.sha,content:btoa(binary),message:(enabled?'Feature':'Unfeature')+' infographic: '+post.path.split('/').pop()})});
      window.InfografFast.invalidate(); document.getElementById('refresh-posts')?.click();
    }catch(error){const status=$('global-status');if(status){status.textContent=error.message||'تعذر تغيير حالة التمييز.';status.className='status error';status.hidden=false;}if(button)button.disabled=false;}
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-feature-path]');if(!button)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();toggleFeatured(decodeURIComponent(button.dataset.featurePath||''),button);},true);
  const observer=new MutationObserver(()=>{if($('posts-list'))decorateRows();});
  document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});setTimeout(decorateRows,250);});
})();