'use client';
import {useCallback,useEffect,useState} from 'react';
import {Building2,ChevronLeft,ChevronRight,Download,Eye,Filter,Globe2,MapPin,Pencil,Plus,Search,Send,Trash2,X,Save,Loader2,ShieldCheck,UserRound} from 'lucide-react';
import {getResults,panelFetch,persian,persianDate,type Page} from '@/lib/panel-api';
import {COLUMN_LABELS,MODULES,STATUS_FA,type Field} from './module-config';
import {RepresentativeImport} from './representative-import';
import {RepresentativeSummary} from './representative-summary';

type Item=Record<string,unknown>&{id?:number};
const safeText=(v:unknown)=>v===undefined||v===null?'':String(v);
const formatValue=(key:string,value:unknown):string=>{
 if(value===null||value===undefined||value==='')return '—';
 if(typeof value==='boolean')return value?'بله':'خیر';
 if(key==='created_at'||key==='updated_at')return persianDate(String(value));
 if(typeof value==='number')return persian(value);
 if(['last_month_sales','performance_score'].includes(key)&&/^[0-9]+$/.test(String(value)))return persian(Number(value));
 return STATUS_FA[String(value)]||String(value);
};
function makeSlug(value:string){return value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/gi,'-').replace(/^-+|-+$/g,'')}
export function PanelTable({module}:{module:string}){
 const cfg=MODULES[module];
 const [list,setList]=useState<Item[]>([]),[count,setCount]=useState(0),[page,setPage]=useState(1),[search,setSearch]=useState('');
 const [draft,setDraft]=useState<Item|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[modalError,setModalError]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  if(!cfg)return;
  setLoading(true);setError('');
  try{
   const result=await panelFetch<Page<Item>>(`${module}/?page=${page}&search=${encodeURIComponent(search)}`);
   setList(getResults(result));setCount(result.count||0);
  }catch(e){setError(e instanceof Error?e.message:'دریافت اطلاعات ممکن نیست')}
  finally{setLoading(false)}
 },[cfg,module,page,search]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{
  if(!draft)return;
  const handleKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setDraft(null)};
  document.addEventListener('keydown',handleKey);
  const focusId=window.requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('.fm-editor-modal input:not([disabled])')?.focus());
  document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',handleKey);window.cancelAnimationFrame(focusId);document.body.style.overflow=''};
 },[draft]);
 if(!cfg)return <div className="fm-panel-card">این بخش وجود ندارد.</div>;
 const isNew=Boolean(draft&&!draft.id);
 function openCreate(){
  const init:Item={};
  for(const field of cfg.fields){
   if(field.type==='checkbox')init[field.key]=field.key==='is_active';
   else if(field.type==='number')init[field.key]='';
   else if(field.type==='select')init[field.key]=field.options?.[0]?.value||'';
   else if(field.type==='multiselect')init[field.key]=[];
   else init[field.key]='';
  }
  setDraft(init);setModalError('');
 }
 async function save(event:React.FormEvent){
  event.preventDefault();if(!draft)return;
  setSaving(true);setModalError('');setMessage('');
  try{
   const data:Record<string,unknown>={};
   const multipart=cfg.fields.some(f=>f.type==='file'&&draft[f.key] instanceof File);
   const form=new FormData();
   for(const field of cfg.fields){
    if(field.readonly)continue;
    const value=draft[field.key];if(value===undefined||value===null)continue;
    if(field.key==='password'&&!value)continue;
    const normalized=field.type==='number'?(value===''?null:Number(value)):value;
    if(multipart){if(value instanceof File)form.set(field.key,value);else if(normalized!==null)form.set(field.key,typeof normalized==='boolean'?String(normalized):String(normalized));}
    else data[field.key]=normalized;
   }
   // Nontechnical managers do not need to type Django slugs and usernames.
   const original=safeText(draft.title);
   if(module==='content'&&!safeText(data.slug).trim()){
    const slug=makeSlug(original);if(!slug)throw new Error('لطفاً یک عنوان معتبر بنویسید.');
    if(multipart)form.set('slug',slug);else data.slug=slug;
   }
   if(module==='users'&&!draft.id&&!safeText(data.username).trim()){
    const prefix=safeText(data.email).split('@')[0].replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,45)||'user';
    data.username=`${prefix}-${Math.random().toString(36).slice(2,7)}`;
   }
   await panelFetch(`${module}/${draft.id?`${draft.id}/`:''}`,draft.id?'PATCH':'POST',multipart?form:data);
   setDraft(null);setMessage('اطلاعات با موفقیت ذخیره شد.');await load();
  }catch(e){setModalError(e instanceof Error?e.message:'خطا در ذخیره')}
  finally{setSaving(false)}
 }
 async function remove(item:Item){
  if(!item.id||!window.confirm('آیا از حذف این مورد مطمئن هستید؟'))return;
  setError('');try{await panelFetch(`${module}/${item.id}/`,'DELETE');setMessage('رکورد حذف شد.');await load()}
  catch(e){setError(e instanceof Error?e.message:'حذف ناموفق بود')}
 }
 async function queue(item:Item){
  if(!item.id||!window.confirm('اطلاعیه برای نمایندگان در صف قرار بگیرد؟'))return;
  setError('');try{await panelFetch(`announcements/${item.id}/queue/`,'POST',{});setMessage('اطلاعیه در صف قرار گرفت؛ ارسال واقعی به سرویس پیام‌رسان نیاز دارد.');await load()}
  catch(e){setError(e instanceof Error?e.message:'عملیات ناموفق بود')}
 }
 return <div className={`fm-data-page${module==='representatives'?' fm-representatives-page':''}`}>
  <div className="fm-page-actions"><div><h2>{cfg.label}</h2><p>{module==='representatives'?'مدیریت اطلاعات تماس، وضعیت همکاری و نمایش عمومی نمایندگان در یک صفحه.':cfg.description}</p></div>{cfg.newAllowed&&<button className="fm-btn fm-btn-primary" onClick={openCreate}><Plus size={16}/>{module==='representatives'?'افزودن نماینده':'افزودن جدید'}</button>}</div>
  {message&&<div className="fm-alert fm-alert-success" role="status">{message}<button onClick={()=>setMessage('')}>بستن</button></div>}
  {error&&<div className="fm-alert fm-alert-error" role="alert">{error}<button onClick={()=>setError('')}>بستن</button></div>}
  {module==='representatives'&&<><div className="fm-rep-guide fm-panel-card"><span className="fm-rep-guide-icon"><Building2 size={19}/></span><div className="fm-rep-guide-main"><strong>روند سادهٔ مدیریت نماینده</strong><div className="fm-rep-guide-steps"><span><i>۱</i>ثبت دستی یا ورود اکسل</span><span><i>۲</i>بررسی و فعال‌سازی همکاری</span><span><i>۳</i>انتخاب نمایش نام و شهر در سایت</span></div><small>شماره تماس، فروش و امتیاز عملکرد فقط در پنل می‌مانند.</small></div></div><RepresentativeImport onImported={()=>{void load()}}/><RepresentativeSummary/></>}
  <div className={`fm-panel-card fm-table-panel${module==='representatives'?' fm-rep-table-panel':''}`}>
   {module==='representatives'&&<div className="fm-rep-table-intro"><div><h3>فهرست نمایندگان</h3><p>برای ویرایش وضعیت همکاری یا اطلاعات، ردیف نماینده را انتخاب کنید.</p></div><span><Building2 size={15}/>{persian(count)} نماینده</span></div>}
   <div className="fm-table-toolbar"><div className="fm-search-box"><Search size={17}/><input value={search} onChange={e=>{setPage(1);setSearch(e.target.value)}} placeholder={module==='representatives'?'نام شرکت، مسئول، شهر یا تلفن را جستجو کنید':`جستجو در ${cfg.label}...`} aria-label="جستجو"/></div><div className="fm-table-counter"><Filter size={15}/>{persian(count)} مورد</div></div>
   <div className="fm-table-scroll"><table className={`fm-table fm-full-table${module==='representatives'?' fm-rep-table':''}`}><thead><tr>{cfg.columns.map(col=><th key={col}>{COLUMN_LABELS[col]||col}</th>)}<th>عملیات</th></tr></thead><tbody>
    {list.map(row=><tr key={String(row.id)}>{cfg.columns.map(col=><td key={col} data-label={COLUMN_LABELS[col]||col}>{module==='representatives'&&col==='company_name'?<div className="fm-rep-company-cell"><strong>{formatValue(col,row[col])}</strong><small>{safeText(row.contact_name)||'نام مسئول ثبت نشده'}</small></div>:module==='representatives'&&col==='city'?<span className="fm-rep-location"><MapPin size={13}/>{safeText(row[col])||'شهر ثبت نشده'}</span>:module==='representatives'&&col==='status'?<span className={`fm-rep-status fm-rep-status-${row[col]}`}>{formatValue(col,row[col])}</span>:module==='representatives'&&col==='is_public'?<span className={`fm-rep-visibility${row[col]?' is-public':''}`}><Globe2 size={13}/>{row[col]?'نمایش عمومی':'فقط پنل'}</span>:module==='representatives'&&col==='last_month_sales'?<span className="fm-rep-sales">{formatValue(col,row[col])}<small>ریال</small></span>:module==='representatives'&&col==='performance_score'?<span className="fm-rep-score"><i><b style={{width:`${Math.max(0,Math.min(100,Number(row[col])||0))}%`}}/></i><strong>{row[col]===null||row[col]===undefined?'—':`${formatValue(col,row[col])} از ۱۰۰`}</strong></span>:col==='status'||col==='role'?<span className={`fm-status-pill fm-status-${row[col]}`}>{formatValue(col,row[col])}</span>:col==='email'?<span dir="ltr">{formatValue(col,row[col])}</span>:formatValue(col,row[col])}</td>)}<td data-label="عملیات"><div className="fm-row-actions">{cfg.editAllowed&&<button aria-label={module==='representatives'?'ویرایش نماینده':'ویرایش'} title={module==='representatives'?'ویرایش نماینده':'ویرایش'} onClick={()=>{setModalError('');setDraft({...row})}}>{module==='representatives'?<Pencil size={16}/>:<Eye size={17}/>}</button>}{module==='applications'&&<a target="_blank" rel="noreferrer" title="دریافت رزومه" href={`/api/panel/manage/applications/${row.id}/resume/`}><Download size={16}/></a>}{module==='announcements'&&row.status==='draft'&&<button aria-label="در صف قرار دادن اطلاعیه" title="صف ارسال" onClick={()=>queue(row)}><Send size={16}/></button>}{cfg.deleteAllowed&&<button aria-label="حذف" title="حذف مورد" onClick={()=>remove(row)}><Trash2 size={16}/></button>}</div></td></tr>)}
   </tbody></table>{!list.length&&<div className="fm-empty-data">{loading?'در حال دریافت اطلاعات...':module==='representatives'?<><strong>{search?'نماینده‌ای با این عبارت پیدا نشد.':'هنوز نماینده‌ای ثبت نشده است.'}</strong>{!search&&cfg.newAllowed&&<button type="button" className="fm-btn fm-btn-primary" onClick={openCreate}><Plus size={15}/>افزودن اولین نماینده</button>}</>:'رکوردی یافت نشد.'}</div>}</div>
   <div className="fm-pagination"><span>صفحه {persian(page)} از {persian(Math.max(1,Math.ceil(count/24)))}</span><div><button disabled={page<=1||loading} onClick={()=>setPage(page-1)} aria-label="صفحه قبلی"><ChevronRight size={18}/></button><button disabled={page*24>=count||loading} onClick={()=>setPage(page+1)} aria-label="صفحه بعدی"><ChevronLeft size={18}/></button></div></div>
  </div>
  {draft&&<div className="fm-modal-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDraft(null)}}>
   <form role="dialog" aria-modal="true" aria-label={isNew?'افزودن اطلاعات':'ویرایش اطلاعات'} className={`fm-editor-modal${module==='users'?' fm-user-editor':''}`} onSubmit={save}>
    <header><div className="fm-editor-modal-title">{module==='users'&&<span className="fm-user-editor-mark"><UserRound size={18}/></span>}<div><strong>{module==='users'?(isNew?'افزودن کاربر':'ویرایش کاربر'):isNew?`افزودن ${cfg.label}`:`ویرایش ${cfg.label}`}</strong><p>{module==='users'?'مشخصات حساب و دسترسی‌های پنل را مدیریت کنید.':'فیلدهای ضروری را تکمیل کنید؛ گزینه‌های تکمیلی اختیاری‌اند.'}</p></div></div><button type="button" aria-label="بستن" onClick={()=>setDraft(null)}><X size={19}/></button></header>
    <div className="fm-editor-fields">
     {modalError&&<div className="fm-alert fm-alert-error" role="alert">{modalError}</div>}
     {module==='users'?<div className="fm-user-editor-content">
      <div className="fm-user-editor-note"><ShieldCheck size={18}/><div><strong>حساب کارکنان پنل</strong><p>دسترسی پیامک مستقل از نقش سازمانی این کاربر تنظیم می‌شود.</p></div></div>
      <section className="fm-user-form-section"><h3>اطلاعات حساب</h3><div className="fm-user-field-grid">{cfg.fields.filter(f=>!f.advanced&&['first_name','last_name','email','password'].includes(f.key)).map(f=><EditorField key={f.key} field={f} value={draft[f.key]} isNew={isNew} onChange={value=>setDraft(prev=>prev?{...prev,[f.key]:value}:null)}/>)}</div></section>
      <section className="fm-user-form-section"><h3>نقش و دسترسی</h3><div className="fm-user-field-grid">{cfg.fields.filter(f=>!f.advanced&&['role','sms_access','is_active'].includes(f.key)).map(f=><EditorField key={f.key} field={f} value={draft[f.key]} isNew={isNew} onChange={value=>setDraft(prev=>prev?{...prev,[f.key]:value}:null)}/>)}</div></section>
     </div>:cfg.fields.filter(f=>!f.advanced).map(f=><EditorField key={f.key} field={f} value={draft[f.key]} isNew={isNew} onChange={value=>setDraft(prev=>prev?{...prev,[f.key]:value}:null)}/>)}
     {cfg.fields.some(f=>f.advanced)&&<details className="fm-fieldset-advanced"><summary>تنظیمات تکمیلی (اختیاری)</summary><div className="fm-editor-fields" style={{padding:0}}>{cfg.fields.filter(f=>f.advanced).map(f=><EditorField key={f.key} field={f} value={draft[f.key]} isNew={isNew} onChange={value=>setDraft(prev=>prev?{...prev,[f.key]:value}:null)}/>)}</div></details>}
    </div>
    <footer><button type="button" className="fm-btn" onClick={()=>setDraft(null)}>انصراف</button><button type="submit" disabled={saving||(!cfg.editAllowed&&!isNew)} className="fm-btn fm-btn-primary">{saving?<Loader2 size={16}/>:<Save size={16}/>}ذخیره</button></footer>
   </form>
  </div>}
 </div>;
}
export function EditorField({field:f,value,onChange,isNew}:{field:Field;value:unknown;onChange:(v:unknown)=>void;isNew?:boolean}){
 const readonly=f.readonly||(!isNew&&f.key==='username');
 if(f.type==='checkbox')return <label className="fm-field fm-field-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)} disabled={readonly}/>{f.label}</label>;
 if(f.type==='multiselect'){
  const selected=Array.isArray(value)?value.map(String):[];
  return <fieldset className="fm-field fm-multiselect-field" disabled={readonly}><legend>{f.label}</legend>{f.hint&&<small>{f.hint}</small>}<div className="fm-multiselect-options">{(f.options||[]).map(option=><label key={option.value} className={selected.includes(option.value)?'is-selected':''}><input type="checkbox" checked={selected.includes(option.value)} onChange={e=>onChange(e.target.checked?[...selected,option.value]:selected.filter(item=>item!==option.value))}/><span>{option.label}</span></label>)}</div></fieldset>;
 }
 return <label className="fm-field"><span>{f.label}{f.required&&<sup>*</sup>}</span>
  {f.type==='select'?<select value={safeText(value)} disabled={readonly} onChange={e=>onChange(e.target.value)}>{(f.options||[]).map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>:
   f.type==='textarea'?<textarea rows={4} disabled={readonly} value={safeText(value)} onChange={e=>onChange(e.target.value)}/>:
   f.type==='file'?<input type="file" accept={f.key==='cover_image'?'image/png,image/jpeg,image/webp':undefined} onChange={e=>onChange(e.target.files?.[0]||'')}/>:
   <input type={f.type||'text'} disabled={readonly} value={safeText(value instanceof File?'':value)} required={f.required} onChange={e=>onChange(f.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)}/>}
  {f.hint&&<small>{f.hint}</small>}
 </label>;
}
