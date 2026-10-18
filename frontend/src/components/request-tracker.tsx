'use client';
import {useState,type FormEvent} from 'react';
import {Search,Loader2} from 'lucide-react';
export function RequestTracker({initialCode=''}:{initialCode?:string}){
 const [code,setCode]=useState(initialCode);
 const [item,setItem]=useState<{tracking_code:string;status:string;kind:string;created_at:string}|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError('');setItem(null);
  try {const res=await fetch(`/api/track/${encodeURIComponent(code.trim())}`);if(!res.ok)throw new Error('درخواستی با این کد پیدا نشد.');setItem(await res.json());}
  catch(err){setError(err instanceof Error?err.message:'خطایی رخ داد.');}finally{setLoading(false);}
 }
 const labels:Record<string,string>={new:'جدید',in_progress:'در حال بررسی',awaiting_reply:'در انتظار پاسخ',closed:'پاسخ داده‌شده',rejected:'ردشده'};
 return <div className="mx-auto w-full max-w-xl rounded-[24px] border border-[#e0e5df] bg-white p-7 shadow-sm sm:p-10">
  <h1 className="text-2xl font-semibold">پیگیری درخواست</h1><form onSubmit={submit} className="mt-7 flex flex-wrap gap-3"><label className="grow"><span className="sr-only">کد پیگیری</span><input value={code} required onChange={e=>setCode(e.target.value)} dir="ltr" className="h-12 w-full rounded-xl border border-[#dfe3df] bg-[#fafbf9] px-4 font-mono text-sm outline-none focus:border-slate-400" placeholder="FM-..."/></label><button className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#202823] px-6 text-sm text-white" disabled={loading} type="submit">{loading?<Loader2 size={16} className="animate-spin"/>:<Search size={16}/>} بررسی</button></form>
  {error&&<p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
  {item&&<div className="mt-7 rounded-xl bg-[#f2f5f1] p-5"><p className="m-0 text-sm">کد: <b dir="ltr">{item.tracking_code}</b></p><p className="mt-3 mb-0 text-sm">وضعیت: <b>{labels[item.status]||item.status}</b></p><p className="mt-3 mb-0 text-xs text-slate-500">زمان ثبت: {new Date(item.created_at).toLocaleDateString('fa-IR')}</p></div>}
 </div>;
}
