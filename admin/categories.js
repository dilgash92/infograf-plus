(() => {
  'use strict';

  const SITE_BASE = '';
  const API = 'https://calm-dream-ae41.dilgash-ibrahim.workers.dev';
  const SESSION_KEY = 'infograf_plus_admin_session';
  const CATEGORIES_PATH = 'categories.json';
  const MISC_CATEGORY = 'منوع';
  const DEFAULT_CATEGORIES = ['العالم','سياسة','اقتصاد ومال','تقنية','علوم','صحة','رياضة','ترفيه','سيارات','سفر','تعليم','تاريخ','مجتمع','فن وثقافة','طبيعة وبيئة','منوع'];

  const $ = id => document.getElementById(id);
  let categories = [];
  let categorySha = '';
  let loadedFromRepo = false;

  function session(){return sessionStorage.getItem(SESSION_KEY)||'';}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function base64FromText(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
  function decodeBase64(value){try{const binary=atob(String(value||'').replace(/\n/g,''));const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));return new TextDecoder('utf-8').decode(bytes);}catch(_){return '';}}

  async function workerRequest(path, options = {}){
    const response=await fetch(`${API}${path}`,{...options,headers:{Accept:'application/json','Content-Type':'application/json',...(session()?{Authorization:`Bearer ${session()}`}:{})}});
    let data=null;try{data=await response.json();}catch(_){}
    if(!response.ok)throw new Error(data?.message||data?.error||`حدث خطأ (${response.status})`);
    return data;
  }

  async function workerWrite(payload){return workerRequest('/api/file',{method:'PUT',body:JSON.stringify(payload)});}

  async function fetchCategoryFile(){
    const response=await fetch(`https://api.github.com/repos/dilgash92/infograf-plus/contents/${CATEGORIES_PATH}?ref=main`,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
    if(!response.ok)throw new Error(`تعذر قراءة categories.json (${response.status})`);
    const data=await response.json();
    categorySha=data.sha||'';
    const decoded=atob(String(data.content||'').replace(/\n/g,''));
    const parsed=JSON.parse(new TextDecoder('utf-8').decode(Uint8Array.from(decoded,ch=>ch.charCodeAt(0))));
    categories=normalizeCategories(parsed?.categories);loadedFromRepo=true;return categories;
  }

  function normalizeCategories(values){return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||'').trim()).filter(Boolean))];}
  function categoryOptions(selected=''){const values=categories.length?categories:DEFAULT_CATEGORIES;return '<option value="">اختر القسم</option>'+values.map(category=>`<option value="${escapeHtml(category)}"${category===selected?' selected':''}>${escapeHtml(category)}</option>`).join('');}
  function populateSelect(selected=''){const select=$('field-category');if(!select)return;select.innerHTML=categoryOptions(selected);select.disabled=false;}
  function showMessage(message,type=''){const target=$('categories-status');if(!target)return;target.textContent=message;target.className=`status${type?` ${type}`:''}`;target.hidden=false;}

  function renderManager(){
    const list=$('categories-list'),count=$('categories-count');if(!list)return;
    if(count)count.textContent=`${categories.length} قسم`;
    list.innerHTML=categories.map(category=>`<div class="category-row"><div><strong>${escapeHtml(category)}</strong><small>اسم القسم</small></div><button type="button" class="button button-danger" data-delete-category="${escapeHtml(category)}"${category===MISC_CATEGORY?' disabled title="قسم التحويل الافتراضي لا يمكن حذفه"':''}>حذف</button></div>`).join('');
  }

  function ensureUI(){
    if($('categories-view'))return;
    const nav=document.querySelector('.sidebar-nav');
    if(nav&&!nav.querySelector('[data-view="categories"]')){const button=document.createElement('button');button.type='button';button.className='nav-item';button.dataset.view='categories';button.textContent='الأقسام';nav.appendChild(button);button.addEventListener('click',switchToCategories);}
    const main=document.querySelector('.main-area'),admins=$('admins-view');if(!main||!admins)return;
    admins.insertAdjacentHTML('afterend',`<section id="categories-view" class="view" hidden><div class="section-card"><div class="section-title-row"><div><p class="eyebrow">تنظيم المحتوى</p><h2>إدارة الأقسام</h2></div><span id="categories-count" class="role-badge">—</span></div><p class="muted">أضف أقساماً جديدة أو احذف قسماً. عند حذف قسم، تنتقل منشوراته تلقائياً إلى «منوع».</p><div class="admin-add-row"><label>اسم القسم<input id="new-category-input" type="text" maxlength="60" placeholder="مثال: جغرافيا" autocomplete="off"></label><button id="add-category-button" class="button button-primary" type="button">إضافة قسم</button></div><div id="categories-status" class="status" hidden></div><div id="categories-list" class="categories-list"></div></div></section>`);
    $('add-category-button')?.addEventListener('click',addCategory);$('new-category-input')?.addEventListener('keydown',event=>{if(event.key==='Enter')addCategory();});$('categories-list')?.addEventListener('click',event=>{const button=event.target.closest('[data-delete-category]');if(button&&!button.disabled)deleteCategory(button.dataset.deleteCategory);});
  }

  function switchToCategories(){
    document.querySelectorAll('.view').forEach(section=>{section.hidden=section.id!=='categories-view';});
    document.querySelectorAll('.nav-item[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view==='categories'));
    const heading=$('page-heading');if(heading)heading.textContent='إدارة الأقسام';
    window.scrollTo({top:0,behavior:'smooth'});renderManager();
  }

  async function saveCategories(next){
    const clean=normalizeCategories(next);if(!clean.length)throw new Error('يجب أن يبقى قسم واحد على الأقل.');
    await workerWrite({path:CATEGORIES_PATH,sha:categorySha||undefined,content:base64FromText(JSON.stringify({categories:clean},null,2)+'\n'),message:'Update infographic categories'});
    categories=clean;await fetchCategoryFile();populateSelect($('field-category')?.value||'');renderManager();
  }

  async function addCategory(){
    const input=$('new-category-input'),value=input?.value.trim()||'';if(!value)return;
    if(categories.some(category=>category.localeCompare(value,'ar',{sensitivity:'base'})===0)){showMessage('هذا القسم موجود مسبقاً.','error');return;}
    const button=$('add-category-button');if(button)button.disabled=true;
    try{await saveCategories([...categories,value]);if(input)input.value='';showMessage('تمت إضافة القسم بنجاح.','success');}catch(error){showMessage(error.message||'تعذر إضافة القسم.','error');}finally{if(button)button.disabled=false;}
  }

  function replacePostCategory(text, category){
    const replacement=`category: ${JSON.stringify(category)}`;
    if(/^category:\s*.*$/m.test(text)) return text.replace(/^category:\s*.*$/m,replacement);
    return text.replace(/^(---\s*\n)/,`$1${replacement}\n`);
  }

  async function movePostsToMisc(deletedCategory){
    const data=await workerRequest('/api/posts');
    const files=Array.isArray(data)?data:[];
    const affected=files.filter(file=>{
      const text=decodeBase64(file.content||'');
      const match=text.match(/^category:\s*(.*)$/m);
      if(!match)return false;
      let value=match[1].trim();
      try{value=JSON.parse(value);}catch(_){value=value.replace(/^['"]|['"]$/g,'');}
      return String(value).trim()===deletedCategory;
    });

    let moved=0;
    for(const file of affected){
      const text=decodeBase64(file.content||'');
      const updated=replacePostCategory(text,MISC_CATEGORY);
      if(updated===text)continue;
      await workerWrite({path:file.path,sha:file.sha,content:base64FromText(updated),message:`Move post to ${MISC_CATEGORY}: ${file.path.split('/').pop()}`});
      moved++;
    }
    return moved;
  }

  async function deleteCategory(category){
    if(category===MISC_CATEGORY){showMessage('لا يمكن حذف قسم «منوع» لأنه القسم الافتراضي للمنشورات عند حذف أي قسم.','error');return;}
    if(categories.length<=1){showMessage('يجب أن يبقى قسم «منوع» وقسم آخر على الأقل.','error');return;}
    if(!categories.includes(MISC_CATEGORY)){showMessage('قسم «منوع» غير موجود. أعد تحميل الصفحة قبل حذف أي قسم.','error');return;}
    if(!window.confirm(`هل تريد حذف قسم «${category}»؟\n\nسيتم نقل جميع منشوراته تلقائياً إلى قسم «${MISC_CATEGORY}»، ثم حذف القسم.`))return;

    const buttons=document.querySelectorAll('[data-delete-category]');buttons.forEach(button=>button.disabled=true);
    try{
      showMessage('جارٍ نقل منشورات القسم إلى «منوع»...');
      const moved=await movePostsToMisc(category);
      await saveCategories(categories.filter(item=>item!==category));
      showMessage(moved?`تم حذف القسم ونقل ${moved} منشوراً إلى «${MISC_CATEGORY}».`:`تم حذف القسم. لم تكن هناك منشورات مرتبطة به.`,'success');
      document.getElementById('refresh-posts')?.click();
    }catch(error){showMessage(error.message||'تعذر حذف القسم. لم يتم حذف القسم من القائمة.','error');}
    finally{buttons.forEach(button=>button.disabled=button.dataset.deleteCategory===MISC_CATEGORY);}
  }

  async function init(){
    ensureUI();const select=$('field-category');if(select){select.disabled=true;select.innerHTML='<option value="">جاري تحميل الأقسام...</option>';}
    try{await fetchCategoryFile();}catch(_){categories=DEFAULT_CATEGORIES.slice();loadedFromRepo=false;}
    populateSelect(select?.value||'');renderManager();
    if(!loadedFromRepo){const status=$('categories-status');if(status){status.textContent='تم تحميل قائمة احتياطية. قد تحتاج إعادة تحميل الصفحة إذا كان ملف الأقسام غير متاح مؤقتاً.';status.className='status';status.hidden=false;}}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();