'use client';

import {useEffect, useMemo, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import NextImage from 'next/image';
import Link from 'next/link';
import {
  BarChart3, Bell, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, ExternalLink, FileText, FolderOpen, Image, LayoutDashboard,
  LogOut, Menu, Megaphone, Package, PanelRightClose, PanelRightOpen,
  Rows3, Search, ShieldCheck, Users, X,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';
import type {AdminMe} from '@/lib/panel-api';
import {FaromidMark} from '@/components/ui/faromid-mark';
import {PageLoader} from '@/components/ui/page-loader';

export const NAV:{href:string;label:string;module:string;icon:LucideIcon;group:string}[] = [
  {href:'/panel', label:'داشبورد', module:'dashboard', icon:LayoutDashboard, group:'overview'},
  {href:'/panel/pages', label:'صفحات سایت', module:'pages', icon:FileText, group:'content'},
  {href:'/panel/media', label:'رسانه و تصاویر', module:'media', icon:Image, group:'content'},
  {href:'/panel/products', label:'محصولات', module:'products', icon:Package, group:'content'},
  {href:'/panel/content', label:'اخبار و گالری', module:'content', icon:FolderOpen, group:'content'},
  {href:'/panel/representatives', label:'نمایندگان', module:'representatives', icon:Users, group:'management'},
  {href:'/panel/inquiries', label:'درخواست‌ها', module:'inquiries', icon:ClipboardList, group:'management'},
  {href:'/panel/applications', label:'استخدام', module:'applications', icon:BriefcaseBusiness, group:'management'},
  {href:'/panel/announcements', label:'اطلاعیه‌ها', module:'announcements', icon:Megaphone, group:'notifications'},
  {href:'/panel/deliveries', label:'گزارش ارسال', module:'deliveries', icon:Rows3, group:'notifications'},
  {href:'/panel/reports', label:'گزارش‌ها و آمار', module:'reports', icon:BarChart3, group:'system'},
  {href:'/panel/sms', label:'پیامک و پاداش فروش', module:'sms', icon:Megaphone, group:'notifications'},
  {href:'/panel/users', label:'کاربران و دسترسی‌ها', module:'users', icon:ShieldCheck, group:'system'},
];
const GROUPS:Record<string,string>={overview:'نمای کلی',content:'محتوای سایت',management:'عملیات',notifications:'سرویس اطلاع‌رسانی',system:'مدیریت سیستم'};
const STORAGE_KEY='faromid-panel-sidebar-collapsed';

export function PanelShell({children}:{children:ReactNode}) {
  const router=useRouter();
  const path=usePathname();
  const [user,setUser]=useState<AdminMe|null>(null);
  const [loading,setLoading]=useState(true);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [search,setSearch]=useState('');
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({});

  useEffect(()=>{
    try { setCollapsed(window.localStorage.getItem(STORAGE_KEY)==='1'); } catch { /* Browsers can disable storage. */ }
  },[]);
  useEffect(()=>{
    let mounted=true;
    fetch('/api/panel/session',{cache:'no-store'}).then(async res=>{
      if(!res.ok){if(res.status===401)router.replace('/panel/login');throw new Error('Session unavailable');}
      return res.json() as Promise<AdminMe>;
    }).then(data=>{if(mounted)setUser(data)}).catch(()=>{if(mounted)setUser(null)}).finally(()=>{if(mounted)setLoading(false)});
    return()=>{mounted=false};
  },[router]);
  useEffect(()=>setMobileOpen(false),[path]);
  useEffect(()=>{
    const active=[...NAV].reverse().find(n=>path===n.href||(n.href!=='/panel'&&path.startsWith(n.href+'/')));
    if(active)setOpenGroups(old=>({...old,[active.group]:true}));
  },[path]);
  useEffect(()=>{
    if(!mobileOpen)return;
    const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileOpen(false)};
    document.addEventListener('keydown',handleKey);
    return()=>document.removeEventListener('keydown',handleKey);
  },[mobileOpen]);
  const menu=useMemo(()=>NAV.filter(n=>user?.modules[n.module]&&n.label.includes(search.trim())),[user,search]);
  const currentItem=([...NAV].reverse().find(n=>path===n.href||path.startsWith(n.href+'/')))||NAV[0];
  const CurrentIcon=currentItem.icon;
  function toggleSidebar(){
    if(window.matchMedia('(max-width: 850px)').matches){setMobileOpen(v=>!v);return;}
    setCollapsed(v=>{const next=!v;try{window.localStorage.setItem(STORAGE_KEY,next?'1':'0')}catch{}return next});
  }
  async function logout(){await fetch('/api/panel/auth/logout',{method:'POST'});router.replace('/panel/login');router.refresh()}
  if(loading)return <PageLoader/>;
  if(!user)return <div className="fm-panel-loading"><ShieldCheck size={28}/>ارتباط با Backend برقرار نیست یا وارد حساب مدیریتی نشده‌اید.<button className="fm-btn fm-btn-primary" onClick={()=>router.replace('/panel/login')}>بازگشت به ورود</button></div>;

  return <div className={`fm-panel-layout ${collapsed?'is-collapsed':''}`} dir="rtl">
    {mobileOpen&&<button type="button" className="fm-sidebar-backdrop" aria-label="بستن منوی مدیریت" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`fm-sidebar ${mobileOpen?'fm-sidebar-open':''}`} aria-label="منوی مدیریت">
      <div className="fm-brand">
        <Link href="/panel" className="fm-brand-identity" title="داشبورد فرامید" aria-label="داشبورد فرامید">
          <span className="fm-brand-logo"><NextImage src="/assets/logo/logo.svg" alt="Faromid Group" width={273} height={72} priority/></span>
          <span className="fm-brand-mini" aria-hidden="true"><FaromidMark/></span>
          <span className="fm-brand-caption">پنل مدیریت وب‌سایت</span>
        </Link>
        <button type="button" className="fm-mobile-close" aria-label="بستن منو" onClick={()=>setMobileOpen(false)}><X size={19}/></button>
      </div>
      <label className="fm-sidebar-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو در منو..." aria-label="جستجوی منو"/></label>
      <nav className="fm-sidebar-nav">
        {Object.keys(GROUPS).map(group=>{
          const entries=menu.filter(n=>n.group===group);
          const expanded=collapsed||Boolean(search.trim())||Boolean(openGroups[group]);
          return entries.length?<div className="fm-menu-group" key={group}>
            <button type="button" className="fm-menu-heading fm-menu-heading-toggle" title={collapsed?GROUPS[group]:undefined} aria-expanded={expanded} aria-controls={`fm-nav-${group}`} onClick={()=>setOpenGroups(old=>({...old,[group]:!old[group]}))}><span>{GROUPS[group]}</span><ChevronDown size={14} aria-hidden="true" className={expanded?'rotate-180':''}/></button>
            {expanded&&<div id={`fm-nav-${group}`}>{entries.map(item=>{
              const Icon=item.icon;
              const active=path===item.href||(item.href!=='/panel'&&path.startsWith(item.href+'/'));
              return <Link href={item.href} key={item.href} title={collapsed?item.label:undefined} className={`fm-menu-link ${active?'is-active':''}`} aria-label={item.label} aria-current={active?'page':undefined}>
                <Icon size={19} strokeWidth={1.85}/><span className="fm-menu-text">{item.label}</span>
              </Link>;
            })}</div>}
          </div>:null;
        })}
      </nav>
      <div className="fm-sidebar-bottom"><div className="fm-user-avatar">{user.name.slice(0,1)}</div><div className="fm-user-meta"><strong>{user.name}</strong><span>{user.email}</span></div></div>
    </aside>
    <div className="fm-main-shell">
      <header className="fm-top-header">
        <div className="fm-page-title">
          <button type="button" className="fm-nav-toggle" onClick={toggleSidebar} aria-label={mobileOpen?'بستن منو':collapsed?'باز کردن سایدبار':'جمع کردن سایدبار'} aria-expanded={!collapsed||mobileOpen} title="نمایش یا پنهان کردن منو">
            <span className="fm-desktop-toggle-icon">{collapsed?<PanelRightOpen size={22}/>:<PanelRightClose size={22}/>}</span>
            <Menu size={21} className="fm-mobile-toggle-icon"/>
          </button>
          <span className="fm-page-title-mark" aria-hidden="true"><CurrentIcon size={17}/></span>
          <div className="fm-page-title-copy"><span className="fm-page-title-eyebrow">FAROMID <i>/</i> PANEL</span><h1>{path==='/panel'?'داشبورد مدیریت فرامید':currentItem.label}</h1><p>{path==='/panel'?'نمای کلی عملکرد وب‌سایت':'مدیریت آسان اطلاعات فرامید'}</p></div>
        </div>
        <div className="fm-top-tools"><div className="fm-header-utility"><span className="fm-date"><CalendarDays size={15}/>{new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(new Date())}</span><Link href="/" className="fm-site-link" target="_blank" rel="noreferrer"><ExternalLink size={15}/><span>مشاهده سایت</span></Link></div><PanelNotificationMenu/><div className="fm-top-account"><span className="fm-top-user"><span className="fm-top-avatar">{user.name.slice(0,1)}</span><span className="fm-top-user-name">{user.name}</span></span><button type="button" className="fm-logout fm-top-logout" aria-label="خروج از پنل" title="خروج از پنل" onClick={logout}><LogOut size={16}/></button></div></div>
      </header>
      <main id="panel-main" className="fm-panel-content">{children}</main>
    </div>
  </div>;
}

type PanelNotice={id:number;title:string;body:string;read_at:string|null;created_at:string};
function PanelNotificationMenu(){
 const [open,setOpen]=useState(false),[items,setItems]=useState<PanelNotice[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const unread=items.filter(item=>!item.read_at).length;
 async function load(){setLoading(true);setError('');try{const response=await fetch('/api/panel/manage/notifications/',{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.detail||'دریافت اعلان‌ها ناموفق بود.');setItems(data.results||[])}catch(e){setError(e instanceof Error?e.message:'دریافت اعلان‌ها ناموفق بود.')}finally{setLoading(false)}}
 async function toggle(){const next=!open;setOpen(next);if(next)await load()}
 async function markRead(item:PanelNotice){if(item.read_at)return;try{const response=await fetch(`/api/panel/manage/notifications/${item.id}/read/`,{method:'POST',headers:{'content-type':'application/json'},body:'{}',cache:'no-store'});if(response.ok)setItems(old=>old.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row))}catch{/* Retrying by reopening the menu is safe. */}}
 return <div className="relative"><button type="button" onClick={()=>void toggle()} aria-label={`اعلان‌های پنل، ${unread} خوانده‌نشده`} aria-expanded={open} className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><Bell size={17}/>{unread>0&&<span className="absolute -left-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-700 px-1 text-[9px] text-white">{unread>9?'۹+':unread}</span>}</button>{open&&<div role="dialog" aria-label="اعلان‌های کاربران پنل" className="absolute left-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-xl"><div className="flex items-center justify-between border-b p-4"><strong className="text-sm">اعلان‌های پنل</strong><button type="button" onClick={()=>void load()} className="text-xs text-slate-500">به‌روزرسانی</button></div>{error?<p role="alert" className="p-4 text-sm text-rose-700">{error}</p>:loading?<p className="p-5 text-center text-sm text-slate-500">در حال دریافت…</p>:items.length?<div className="max-h-[min(65vh,440px)] overflow-y-auto">{items.map(item=><button type="button" key={item.id} onClick={()=>void markRead(item)} className={`block w-full border-b px-4 py-3 text-right last:border-0 hover:bg-slate-50 ${item.read_at?'':'bg-rose-50/60'}`}><span className="flex items-center justify-between gap-2"><strong className="text-sm">{item.title}</strong>{item.read_at?<Check size={14} className="text-slate-400"/>:<i className="h-2 w-2 rounded-full bg-rose-600"/>}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">{item.body}</span><span className="mt-1 block text-[10px] text-slate-400">{new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(new Date(item.created_at))}</span></button>)}</div>:<p className="p-5 text-center text-sm text-slate-500">اعلان تازه‌ای ندارید.</p>}<button type="button" onClick={()=>setOpen(false)} className="w-full border-t p-3 text-xs text-slate-500 hover:bg-slate-50">بستن</button></div>}</div>
}
