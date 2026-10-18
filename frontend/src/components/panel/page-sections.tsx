'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowLeft,FileText,Image,Layers,Package,Plus,Save,X,Pencil} from 'lucide-react';
import {getResults,panelFetch,type Page} from '@/lib/panel-api';
import {SectionEditor} from './section-editor';
import {PageLivePreview} from './page-live-preview';

type SitePage={id:number;key:string;name:string;description:string};
type Section={id:number;name:string;kind:string;sort_order:number;key:string;is_published:boolean;published_at:string|null;image_url:string};
type SEO={title:string;description:string;seo_title:string;seo_description:string;indexable:boolean};
const kinds:Record<string,string>={hero:'بنر اصلی',text:'متن و تصویر',gallery:'گالری',products:'محصولات ویژه',cards:'کارت محتوا'};
const EMPTY_SEO:SEO={title:'',description:'',seo_title:'',seo_description:'',indexable:true};
export function PageSections({pageKey}:{pageKey:string}){
 const [page,setPage]=useState<SitePage|null>(null),[sections,setSections]=useState<Section[]>([]),[seo,setSeo]=useState<SEO>(EMPTY_SEO);
 const [createOpen,setCreateOpen]=useState(false),[editId,setEditId]=useState<number|null>(null),[focusKey,setFocusKey]=useState('hero');
 const [newName,setNewName]=useState(''),[newKey,setNewKey]=useState(''),[newKind,setNewKind]=useState('text');
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const load=useCallback(async()=>{
   // Each API is independent; a failed SEO route must not hide page sections.
   const [p,s,se]=await Promise.allSettled([
     panelFetch<SitePage>(`pages/${pageKey}/`),
     panelFetch<Page<Section>>(`sections/?page_key=${encodeURIComponent(pageKey)}&page_size=100`),
     panelFetch<SEO>(`pages/${pageKey}/seo/`),
   ]);
   const failures:string[]=[];
   if(p.status==='fulfilled')setPage(p.value);else failures.push('اطلاعات صفحه: '+p.reason.message);
   if(s.status==='fulfilled')setSections(getResults(s.value));else failures.push('بخش‌های صفحه: '+s.reason.message);
   if(se.status==='fulfilled')setSeo(se.value);else failures.push('تنظیمات سئو: '+se.reason.message);
   setError(failures.length?failures.join(' | '):'');
 },[pageKey]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{
   if(!createOpen&&editId===null)return;
   const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setCreateOpen(false);setEditId(null);void load();}};
   document.addEventListener('keydown',escape);document.body.style.overflow='hidden';
   return()=>{document.removeEventListener('keydown',escape);document.body.style.overflow=''};
 },[createOpen,editId,load]);
 async function saveSeo(){setError('');try{await panelFetch(`pages/${pageKey}/seo/`,'PATCH',seo as unknown as Record<string,unknown>);setMessage('تنظیمات موتورهای جستجو ذخیره شد.')}catch(e){setError(e instanceof Error?e.message:'خطا در ذخیره سئو')}}
 async function createSection(e:React.FormEvent){
   e.preventDefault();if(!page)return;
   setSaving(true);setError('');
   try{
     const key=newKey.trim()||('section-'+Date.now().toString(36));
     const result=await panelFetch<{id:number}>('sections/','POST',{page:page.id,key,name:newName,kind:newKind,sort_order:sections.length*10,draft_enabled:true});
     setCreateOpen(false);setNewName('');setNewKey('');setEditId(result.id);await load();
   }catch(e){setError(e instanceof Error?e.message:'ایجاد بخش ناموفق بود')}
   finally{setSaving(false)}
 }
 return <div className="fm-data-page">
  <div className="fm-page-actions"><div><Link href="/panel/pages" className="fm-backlink"><ArrowRight size={16}/>همه صفحات</Link><h2>صفحه «{page?.name||pageKey}»</h2><p>برای ویرایش هر قسمت، دکمه «ویرایش» را بزنید.</p></div><button className="fm-btn fm-btn-primary" disabled={!page} onClick={()=>setCreateOpen(true)}><Plus size={17}/>افزودن بخش</button></div>
  {error&&<div className="fm-alert fm-alert-error" role="alert">{error}</div>}{message&&<div className="fm-alert fm-alert-success" role="status">{message}</div>}
  <PageLivePreview pageKey={pageKey} selectedKey={focusKey} sections={sections.map(s=>({key:s.key,name:s.name}))} onSelect={key=>{setFocusKey(key);const chosen=sections.find(s=>s.key===key);if(chosen)setEditId(chosen.id)}} onFocus={setFocusKey}/>
  <div className="fm-section-list">{sections.map(section=>{
    const Icon=section.kind==='gallery'?Image:section.kind==='products'?Package:section.kind==='hero'?Layers:FileText;
    return <div key={section.id} className="fm-section-tile"><span className="fm-section-icon"><Icon size={22}/></span><div className="fm-section-text"><strong>{section.name}</strong><small>{kinds[section.kind]||section.kind}</small></div><span className={`fm-status-pill ${section.is_published?'fm-status-published':'fm-status-draft'}`}>{section.is_published?'منتشرشده':'پیش‌نویس'}</span><button type="button" className="fm-btn fm-btn-sm fm-btn-soft" onClick={()=>{setFocusKey(section.key);setEditId(section.id)}}><Pencil size={15}/>ویرایش</button></div>;
  })}{sections.length===0&&!error&&<div className="fm-panel-card fm-empty-data">بخشی در این صفحه ثبت نشده است؛ با دکمه «افزودن بخش» شروع کنید.</div>}</div>
  <details className="fm-fieldset-advanced fm-panel-card fm-page-seo"><summary>تنظیمات پیشرفته سئو صفحه</summary><div className="fm-form-grid"><label className="fm-field"><span>عنوان صفحه</span><input value={seo.title||''} onChange={e=>setSeo({...seo,title:e.target.value})}/></label><label className="fm-field"><span>عنوان سئو</span><input value={seo.seo_title||''} onChange={e=>setSeo({...seo,seo_title:e.target.value})}/></label><label className="fm-field fm-span-two"><span>توضیحات سئو</span><textarea rows={2} value={seo.seo_description||''} onChange={e=>setSeo({...seo,seo_description:e.target.value})}/></label><label className="fm-field-check"><input type="checkbox" checked={seo.indexable} onChange={e=>setSeo({...seo,indexable:e.target.checked})}/>نمایش در موتورهای جستجو</label></div><button type="button" className="fm-btn fm-btn-soft" onClick={saveSeo}><Save size={17}/>ذخیره</button></details>
  {createOpen&&<div className="fm-modal-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCreateOpen(false)}}><form role="dialog" aria-modal="true" aria-label="افزودن بخش صفحه" className="fm-editor-modal" onSubmit={createSection}><header><div><strong>افزودن بخش به صفحه</strong><p>نام و نوع بخش را انتخاب کنید.</p></div><button type="button" onClick={()=>setCreateOpen(false)} aria-label="بستن"><X size={18}/></button></header><div className="fm-editor-fields">{error&&<div className="fm-alert fm-alert-error">{error}</div>}<label className="fm-field"><span>نام بخش *</span><input required autoFocus value={newName} onChange={e=>setNewName(e.target.value)}/></label><label className="fm-field"><span>نوع بخش</span><select value={newKind} onChange={e=>setNewKind(e.target.value)}>{Object.entries(kinds).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><details className="fm-fieldset-advanced"><summary>تنظیمات تکمیلی</summary><label className="fm-field"><span>شناسه فنی بخش</span><input dir="ltr" pattern="[a-z0-9_-]+" placeholder="در صورت خالی بودن خودکار ساخته می‌شود" value={newKey} onChange={e=>setNewKey(e.target.value)}/></label></details></div><footer><button type="button" className="fm-btn" onClick={()=>setCreateOpen(false)}>انصراف</button><button type="submit" disabled={saving} className="fm-btn fm-btn-primary">{saving?'در حال ثبت...':'ساخت بخش'}</button></footer></form></div>}
  {editId!==null&&<div className="fm-modal-layer fm-modal-section-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setEditId(null);void load()}}}><section className="fm-editor-modal fm-modal-product fm-modal-section" role="dialog" aria-modal="true" aria-label="ویرایش بخش صفحه"><header><div><strong>ویرایش بخش صفحه</strong><p>می‌توانید پیش‌نویس را ذخیره کنید یا آن را منتشر کنید.</p></div><button type="button" aria-label="بستن پنجره" onClick={()=>{setEditId(null);void load()}}><X size={20}/></button></header><div className="fm-editor-fields"><SectionEditor pageKey={pageKey} sectionId={String(editId)}/></div></section></div>}
 </div>;
}
