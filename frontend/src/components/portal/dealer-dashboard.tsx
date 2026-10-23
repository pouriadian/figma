'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {Bell,BellDot,Box,ClipboardList,LogOut,Plus,RefreshCw,ArrowUpLeft} from 'lucide-react';
import {PageLoader} from '@/components/ui/page-loader';

type User={company_name:string;name:string;code:string;city:string};
type Stats={total_inquiries:number;open_inquiries:number;unread_notifications:number};
type Inquiry={id:number;tracking_code:string;kind:string;message:string;status:string;created_at:string;product_name:string|null};
type Notification={id:number;title:string;body:string;read_at:string|null;created_at:string};
type Result<T>={results:T[]};
const statusText:Record<string,string>={new:'جدید',in_progress:'در حال بررسی',awaiting_reply:'در انتظار پاسخ',closed:'بسته‌شده',rejected:'ردشده'};
const label='block text-xs font-medium text-[#626f65]';
const input='mt-2 h-12 w-full rounded-xl border border-[#e1e5de] bg-white px-4 text-sm outline-none focus:border-[#728274]';
export function DealerDashboard({products}:{products:{id:number;code:string|number;name:string}[]}){
 const router=useRouter();const [user,setUser]=useState<User|null>(null);const [stats,setStats]=useState<Stats|null>(null);
 const [inquiries,setInquiries]=useState<Inquiry[]>([]);const [notifications,setNotifications]=useState<Notification[]>([]);
 const [tab,setTab]=useState<'inquiries'|'notifications'>('inquiries');const [loading,setLoading]=useState(true);const [initialLoad,setInitialLoad]=useState(true);
 const [showForm,setShowForm]=useState(false);const [kind,setKind]=useState('quote');const [product,setProduct]=useState('');
 const [message,setMessage]=useState('');const [error,setError]=useState('');const [result,setResult]=useState('');
 async function load(){setLoading(true);try{
  const [a,b,c,d]=await Promise.all(['me','dashboard','inquiries','notifications'].map(key=>fetch(`/api/portal/${key}`,{cache:'no-store'})));
  if(a.status===401||a.status===403){router.replace('/representative/login');return;}
  if(!a.ok||!b.ok||!c.ok||!d.ok)throw new Error('بارگذاری اطلاعات ناموفق بود.');
  setUser(await a.json());setStats(await b.json());setInquiries((await c.json() as Result<Inquiry>).results);setNotifications((await d.json() as Result<Notification>).results);
 }catch(err){setError(err instanceof Error?err.message:'خطا در ارتباط');}finally{setLoading(false);setInitialLoad(false);}}
 useEffect(()=>{void load();},[]);
 async function send(e:FormEvent){e.preventDefault();setError('');setResult('');
  try {const res=await fetch('/api/portal/inquiries',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,product:product?Number(product):null,message})});
   if(!res.ok)throw new Error('ثبت استعلام ناموفق بود. کد محصول و متن را بررسی کنید.');
   const data=await res.json();setResult(data.tracking_code);setMessage('');setProduct('');setShowForm(false);void load();
  }catch(err){setError(err instanceof Error?err.message:'خطا');}}
 async function read(id:number){const res=await fetch(`/api/portal/notifications/${id}/read`,{method:'POST'});if(res.ok)void load();}
 async function logout(){await fetch('/api/auth/logout',{method:'POST'});router.replace('/representative/login');router.refresh();}
 if(initialLoad)return <PageLoader/>;
 const cards=[{name:'استعلام‌ها',value:stats?.total_inquiries??'—',icon:ClipboardList},{name:'در حال پیگیری',value:stats?.open_inquiries??'—',icon:Box},{name:'اعلان خوانده‌نشده',value:stats?.unread_notifications??'—',icon:BellDot}];
 return <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-16">
  <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="mb-2 text-xs tracking-wider text-[#7b837b]">FAROMID / REPRESENTATIVE PORTAL</p><h1 className="mb-1 text-2xl font-semibold text-[#222e26] sm:text-3xl">{user?.company_name||'پنل نمایندگان'}</h1><p className="m-0 text-sm text-[#838c83]">{user?`خوش آمدید ${user.name} • ${user.code}`:'در حال دریافت اطلاعات...'}</p></div><div className="flex gap-2"><button type="button" onClick={()=>void load()} className="flex h-11 items-center gap-2 rounded-xl border border-[#dfe4dd] bg-white px-4 text-sm"><RefreshCw size={16}/> بروزرسانی</button><button type="button" onClick={()=>void logout()} className="flex h-11 items-center gap-2 rounded-xl bg-[#28302a] px-4 text-sm text-white"><LogOut size={16}/> خروج</button></div></div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
  <div className="mt-10 grid gap-4 sm:grid-cols-3">{cards.map(card=><div key={card.name} className="rounded-[22px] border border-[#e3e8e1] bg-white p-7"><card.icon size={22} className="text-[#6c796c]"/><p className="mt-5 text-sm text-[#737b73]">{card.name}</p><b className="mt-1 block text-3xl text-[#29322b]">{card.value}</b></div>)}</div>
  <div className="mt-8 overflow-hidden rounded-[24px] border border-[#e2e6df] bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e8e2] p-5 sm:p-7"><div className="flex gap-5">{[['inquiries','استعلام‌ها'],['notifications','اطلاعیه‌ها']].map(([key,title])=><button key={key} onClick={()=>setTab(key as 'inquiries'|'notifications')} className={`py-2 text-sm ${tab===key?'border-b-2 border-[#343d34] font-semibold text-[#273328]':'text-[#8b928b]'}`}>{title}</button>)}</div>{tab==='inquiries'&&<button onClick={()=>setShowForm(!showForm)} className="flex h-10 items-center gap-2 rounded-full bg-[#303a32] px-5 text-sm text-white"><Plus size={16}/> استعلام جدید</button>}</div>
   {result&&<div className="m-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">استعلام ثبت شد: {result}</div>}
   {showForm&&tab==='inquiries'&&<form onSubmit={send} className="grid gap-4 border-b border-[#e5e8e2] bg-[#f6f8f5] p-5 sm:grid-cols-2 sm:p-7"><label className={label}>نوع درخواست<select value={kind} onChange={e=>setKind(e.target.value)} className={input}><option value="quote">استعلام قیمت</option><option value="product_info">اطلاعات محصول</option></select></label><label className={label}>محصول *<select required className={input} value={product} onChange={e=>setProduct(e.target.value)}><option value="">انتخاب محصول</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — {p.code}</option>)}</select></label><label className={`${label} sm:col-span-2`}>توضیحات درخواست *<textarea minLength={8} required rows={4} value={message} onChange={e=>setMessage(e.target.value)} className={`${input} h-auto min-h-28 py-3`}/></label><button className="h-11 w-fit rounded-xl bg-[#303a32] px-8 text-sm text-white">ثبت استعلام</button></form>}
   {tab==='inquiries'?<div className="divide-y divide-[#edf0eb]">{inquiries.length?inquiries.map(item=><div className="flex flex-wrap justify-between gap-5 p-5 sm:p-7" key={item.id}><div><p className="mb-2 text-sm font-semibold">{item.kind==='quote'?'استعلام قیمت':'اطلاعات محصول'} — {item.product_name||'محصول'}</p><p className="mb-2 max-w-2xl text-sm leading-8 text-[#667269]">{item.message}</p><span className="font-mono text-xs text-[#959f96]">{item.tracking_code}</span></div><div className="text-xs text-[#5c675d]">{statusText[item.status]||item.status}<p>{new Date(item.created_at).toLocaleDateString('fa-IR')}</p></div></div>):<p className="p-8 text-center text-sm text-[#8d948d]">درخواستی ثبت نشده است.</p>}</div>:
    <div className="divide-y divide-[#edf0eb]">{notifications.length?notifications.map(item=><div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7" key={item.id}><div className="flex items-start gap-4"><Bell size={18}/><div><p className="m-0 text-sm font-semibold">{item.title}</p><p className="mt-2 mb-0 text-sm leading-8 text-[#667269]">{item.body}</p><span className="text-xs text-[#8d948d]">{new Date(item.created_at).toLocaleDateString('fa-IR')}</span></div></div>{!item.read_at&&<button onClick={()=>void read(item.id)} className="rounded-full border border-[#dfe4de] px-4 py-2 text-xs">علامت‌گذاری خوانده‌شده</button>}</div>):<p className="p-8 text-center text-sm text-[#8d948d]">اطلاعیه‌ای موجود نیست.</p>}</div>}
  </div>
 </div>;
}
