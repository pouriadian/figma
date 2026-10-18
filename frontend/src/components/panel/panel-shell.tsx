'use client';

import {useEffect, useMemo, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, Boxes, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardList, ExternalLink, FileText, FolderOpen, Image, LayoutDashboard,
  LogOut, Menu, Megaphone, Package, PanelRightClose, PanelRightOpen,
  Rows3, Search, ShieldCheck, Users, X,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';
import type {AdminMe} from '@/lib/panel-api';

export const NAV:{href:string;label:string;module:string;icon:LucideIcon;group:string}[] = [
  {href:'/panel', label:'داشبورد', module:'dashboard', icon:LayoutDashboard, group:'overview'},
  {href:'/panel/pages', label:'صفحات سایت', module:'pages', icon:FileText, group:'content'},
  {href:'/panel/media', label:'رسانه و تصاویر', module:'media', icon:Image, group:'content'},
  {href:'/panel/products', label:'محصولات', module:'products', icon:Package, group:'content'},
  {href:'/panel/categories', label:'دسته‌بندی‌ها', module:'categories', icon:Boxes, group:'content'},
  {href:'/panel/content', label:'اخبار و گالری', module:'content', icon:FolderOpen, group:'content'},
  {href:'/panel/representatives', label:'نمایندگان', module:'representatives', icon:Users, group:'management'},
  {href:'/panel/inquiries', label:'درخواست‌ها', module:'inquiries', icon:ClipboardList, group:'management'},
  {href:'/panel/applications', label:'استخدام', module:'applications', icon:BriefcaseBusiness, group:'management'},
  {href:'/panel/announcements', label:'اطلاع‌رسانی', module:'announcements', icon:Megaphone, group:'management'},
  {href:'/panel/deliveries', label:'گزارش ارسال', module:'deliveries', icon:Rows3, group:'management'},
  {href:'/panel/reports', label:'گزارش‌ها و آمار', module:'reports', icon:BarChart3, group:'system'},
  {href:'/panel/users', label:'کاربران و دسترسی‌ها', module:'users', icon:ShieldCheck, group:'system'},
];
const GROUPS:Record<string,string>={overview:'نمای کلی',content:'محتوای سایت',management:'عملیات',system:'مدیریت سیستم'};
const STORAGE_KEY='faromid-panel-sidebar-collapsed';

export function PanelShell({children}:{children:ReactNode}) {
  const router=useRouter();
  const path=usePathname();
  const [user,setUser]=useState<AdminMe|null>(null);
  const [loading,setLoading]=useState(true);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const [search,setSearch]=useState('');

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
    if(!mobileOpen)return;
    const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setMobileOpen(false)};
    document.addEventListener('keydown',handleKey);
    return()=>document.removeEventListener('keydown',handleKey);
  },[mobileOpen]);
  const menu=useMemo(()=>NAV.filter(n=>user?.modules[n.module]&&n.label.includes(search.trim())),[user,search]);
  const current=([...NAV].reverse().find(n=>path===n.href||path.startsWith(n.href+'/')))?.label||'داشبورد';
  function toggleSidebar(){
    if(window.matchMedia('(max-width: 850px)').matches){setMobileOpen(v=>!v);return;}
    setCollapsed(v=>{const next=!v;try{window.localStorage.setItem(STORAGE_KEY,next?'1':'0')}catch{}return next});
  }
  async function logout(){await fetch('/api/panel/auth/logout',{method:'POST'});router.replace('/panel/login');router.refresh()}
  if(loading)return <div className="fm-panel-loading"><span className="fm-loader"/>در حال بررسی دسترسی پنل...</div>;
  if(!user)return <div className="fm-panel-loading"><ShieldCheck size={28}/>ارتباط با Backend برقرار نیست یا وارد حساب مدیریتی نشده‌اید.<button className="fm-btn fm-btn-primary" onClick={()=>router.replace('/panel/login')}>بازگشت به ورود</button></div>;

  return <div className={`fm-panel-layout ${collapsed?'is-collapsed':''}`} dir="rtl">
    {mobileOpen&&<button type="button" className="fm-sidebar-backdrop" aria-label="بستن منوی مدیریت" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`fm-sidebar ${mobileOpen?'fm-sidebar-open':''}`} aria-label="منوی مدیریت">
      <div className="fm-brand">
        <Link href="/panel" className="fm-brand-identity" title="داشبورد فرامید" aria-label="داشبورد فرامید">
          <span className="fm-brand-logo"><img src="/assets/logo/logo.svg" alt="لوگوی فرامید"/></span>
          <span className="fm-brand-mini" aria-hidden="true">F</span>
          <span className="fm-brand-caption">پنل مدیریت وب‌سایت</span>
        </Link>
        <button type="button" className="fm-mobile-close" aria-label="بستن منو" onClick={()=>setMobileOpen(false)}><X size={19}/></button>
      </div>
      <label className="fm-sidebar-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجو در منو..." aria-label="جستجوی منو"/></label>
      <nav className="fm-sidebar-nav">
        {Object.keys(GROUPS).map(group=>{
          const entries=menu.filter(n=>n.group===group);
          return entries.length?<div className="fm-menu-group" key={group}>
            <div className="fm-menu-heading">{GROUPS[group]}</div>
            {entries.map(item=>{
              const Icon=item.icon;
              const active=path===item.href||(item.href!=='/panel'&&path.startsWith(item.href+'/'));
              return <Link href={item.href} key={item.href} title={collapsed?item.label:undefined} className={`fm-menu-link ${active?'is-active':''}`} aria-label={item.label} aria-current={active?'page':undefined}>
                <Icon size={19} strokeWidth={1.85}/><span className="fm-menu-text">{item.label}</span>
              </Link>;
            })}
          </div>:null;
        })}
      </nav>
      <div className="fm-sidebar-bottom"><div className="fm-user-avatar">{user.name.slice(0,1)}</div><div className="fm-user-meta"><strong>{user.name}</strong><span>{user.email}</span></div><button className="fm-logout" aria-label="خروج از پنل" title="خروج از پنل" onClick={logout}><LogOut size={18}/></button></div>
    </aside>
    <div className="fm-main-shell">
      <header className="fm-top-header">
        <div className="fm-page-title">
          <button type="button" className="fm-nav-toggle" onClick={toggleSidebar} aria-label={mobileOpen?'بستن منو':collapsed?'باز کردن سایدبار':'جمع کردن سایدبار'} aria-expanded={!collapsed||mobileOpen} title="نمایش یا پنهان کردن منو">
            <span className="fm-desktop-toggle-icon">{collapsed?<PanelRightOpen size={22}/>:<PanelRightClose size={22}/>}</span>
            <Menu size={21} className="fm-mobile-toggle-icon"/>
          </button>
          <div><h1>{path==='/panel'?'داشبورد مدیریت فرامید':current}</h1><p>{path==='/panel'?'نمای کلی عملکرد وب‌سایت':'مدیریت آسان اطلاعات فرامید'}</p></div>
        </div>
        <div className="fm-top-tools"><span className="fm-date"><CalendarDays size={16}/>{new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(new Date())}</span><Link href="/" className="fm-icon-control" title="مشاهده سایت" target="_blank" aria-label="مشاهده سایت"><ExternalLink size={18}/></Link><span className="fm-top-avatar">{user.name.slice(0,1)}</span></div>
      </header>
      <main id="panel-main" className="fm-panel-content">{children}</main>
    </div>
  </div>;
}
