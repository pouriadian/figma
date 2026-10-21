'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,CheckCircle2,ChevronLeft,Eye,FileText,Grid2X2,Home,Image,Layers,Package,Phone,RotateCw,Search,X} from 'lucide-react';
import {getResults,panelFetch,type Page} from '@/lib/panel-api';

type SitePage={id:number;key:string;name:string;description:string;section_count:number;is_active:boolean};
const PAGE_ICONS:Record<string,typeof Home>={home:Home,products:Package,about:Layers,contact:Phone,gallery:Image};
const PAGE_LABELS:Record<string,string>={home:'صفحه اصلی',products:'محصولات',about:'درباره ما',contact:'تماس با ما',gallery:'گالری'};
const PAGE_HINTS:Record<string,string>={home:'بنر اصلی، معرفی، ارزش‌ها و گالری خانه',products:'کالکشن‌ها، معرفی محصولات و بخش‌های کاتالوگ',about:'معرفی شرکت و اطلاعات تکمیلی',contact:'راه‌های تماس و اطلاعات نقشه',gallery:'تصاویر و محتوای گالری'};

export function PanelPages(){
 const [items,setItems]=useState<SitePage[]>([]),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const result=await panelFetch<Page<SitePage>>('pages/?page_size=100');setItems(getResults(result))}catch(err){setError(err instanceof Error?err.message:'دریافت صفحات سایت ناموفق بود.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 const visible=useMemo(()=>items.filter(item=>`${PAGE_LABELS[item.key]||item.name} ${item.description||''}`.toLocaleLowerCase('fa').includes(search.trim().toLocaleLowerCase('fa'))),[items,search]);

 return <div className="fm-data-page fm-pages-manager" dir="rtl">
  <div className="fm-page-actions"><div><span className="fm-products-eyebrow">WEBSITE CONTENT</span><h2>مدیریت صفحات سایت</h2><p>صفحه را پیدا کنید و محتوای همان صفحه را مرحله‌به‌مرحله ویرایش کنید.</p></div><Link href="/" target="_blank" rel="noreferrer" className="fm-btn fm-pages-site-link"><Eye size={15}/>مشاهده سایت<ArrowLeft size={15}/></Link></div>

  <section className="fm-panel-card fm-pages-workflow" aria-label="مراحل ویرایش صفحات">
   {[{icon:Grid2X2,title:'انتخاب صفحه',detail:'صفحه موردنظر را پیدا کنید'},{icon:FileText,title:'ویرایش بخش‌ها',detail:'متن، تصویر یا محصولات'},{icon:CheckCircle2,title:'بازبینی و انتشار',detail:'نتیجه را در سایت ببینید'}].map((step,index)=>{const Icon=step.icon;return <div className="fm-pages-workflow-step" key={step.title}><span className="fm-pages-workflow-icon"><Icon size={16}/></span><div><strong><i>{index+1}</i>{step.title}</strong><small>{step.detail}</small></div>{index<2&&<ChevronLeft className="fm-pages-workflow-arrow" size={15}/>}</div>})}
  </section>

  <section className="fm-panel-card fm-pages-list-card" aria-labelledby="fm-pages-list-title">
   <div className="fm-pages-list-header"><div><h3 id="fm-pages-list-title">صفحه‌های قابل مدیریت</h3><p>{loading?'در حال دریافت فهرست...':`${visible.length} صفحه${search?' مطابق جستجو':''}`}</p></div><label className="fm-search-box"><Search size={16}/><input aria-label="جستجوی صفحه" placeholder="مثلاً محصولات یا تماس با ما" value={search} onChange={event=>setSearch(event.target.value)}/>{search&&<button type="button" aria-label="پاک کردن جستجو" onClick={()=>setSearch('')}><X size={14}/></button>}</label></div>
   {error?<div className="fm-pages-state" role="alert"><span className="fm-pages-state-icon"><RotateCw size={20}/></span><strong>صفحه‌ها بارگذاری نشدند</strong><p>{error}</p><button type="button" className="fm-btn fm-btn-soft" onClick={()=>void load()}><RotateCw size={14}/>تلاش دوباره</button></div>:loading?<div className="fm-pages-loading" role="status"><span className="fm-pages-spinner"/>در حال آماده‌سازی صفحه‌ها...</div>:visible.length?<div className="fm-page-grid">{visible.map(page=>{const Icon=PAGE_ICONS[page.key]||FileText;const label=PAGE_LABELS[page.key]||page.name;return <Link key={page.id} href={`/panel/pages/${page.key}`} className="fm-page-tile fm-page-tile-friendly"><div className="fm-page-tile-top"><span className="fm-page-tile-icon"><Icon size={21}/></span><span className={`fm-page-state-pill ${page.is_active?'is-active':''}`}>{page.is_active?'فعال':'غیرفعال'}</span></div><h3>{label}</h3><p>{PAGE_HINTS[page.key]||page.description||'مدیریت محتوا و رسانه‌های این صفحه'}</p><div className="fm-page-tile-footer"><span>{page.section_count.toLocaleString('fa-IR')} بخش قابل ویرایش</span><span className="fm-page-edit-link">مدیریت صفحه<ArrowLeft size={15}/></span></div></Link>})}</div>:<div className="fm-pages-state"><span className="fm-pages-state-icon"><Search size={20}/></span><strong>{search?'صفحه‌ای با این عبارت پیدا نشد.':'هنوز صفحه‌ای برای مدیریت ثبت نشده است.'}</strong><p>{search?'نام صفحه را کوتاه‌تر یا با عبارت دیگری جستجو کنید.':'برای آماده‌سازی فهرست صفحات، تنظیمات اولیه سایت را بررسی کنید.'}</p>{search&&<button type="button" className="fm-btn fm-btn-soft" onClick={()=>setSearch('')}>پاک کردن جستجو</button>}</div>}
  </section>
 </div>;
}
