'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Loader2,LockKeyhole} from 'lucide-react';
export function DealerLogin(){
 const router=useRouter();const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [pending,setPending]=useState(false);const [error,setError]=useState('');
 async function submit(e:FormEvent){e.preventDefault();setPending(true);setError('');
  try {const res=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
  const data=await res.json();if(!res.ok)throw new Error(data.detail||'ورود ناموفق بود');router.push('/representative');router.refresh();}
  catch(err){setError(err instanceof Error?err.message:'خطا در ورود');}finally{setPending(false);}
 }
 return <div className="mx-auto max-w-md rounded-[28px] border border-[#e0e3df] bg-white p-7 shadow-[0_15px_50px_rgba(17,31,23,.05)] sm:p-10">
  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#28302a] text-white"><LockKeyhole size={26}/></div>
  <h1 className="m-0 text-2xl font-semibold">ورود نمایندگان</h1><p className="mt-3 text-sm leading-8 text-[#737b75]">پیگیری استعلام‌ها و دریافت اطلاعیه‌های شرکت</p>
  <form onSubmit={submit} className="mt-7 grid gap-5"><label className="grid gap-2 text-sm">ایمیل<input type="email" required autoComplete="username" dir="ltr" className="h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-slate-500" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="grid gap-2 text-sm">رمز عبور<input type="password" required autoComplete="current-password" className="h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-slate-500" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}
   <button type="submit" disabled={pending} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#272e29] text-white transition hover:bg-[#48564c] disabled:opacity-60">{pending?<Loader2 className="animate-spin" size={18}/>:<ArrowLeft size={18}/>} ورود به پنل</button>
  </form></div>;
}
