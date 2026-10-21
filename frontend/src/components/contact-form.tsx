'use client';

import {useState, type FormEvent, type ChangeEvent} from 'react';
import {ArrowUpLeft,Loader2,CheckCircle2} from 'lucide-react';
import Link from 'next/link';

type FormType='contact'|'careers'|'dealership'|'collaboration'|'quote';
const input='h-12 w-full min-w-0 rounded-xl border border-[#e2e3dd] bg-[#fafaf8] px-4 text-sm text-[#2b302c] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[#a9ada7] focus:border-[#7d897f] focus:bg-white focus:ring-4 focus:ring-[#78867a]/10';

export function ContactForm({type='contact',productId}:{type?:FormType;productId?:number}){
 const [values,setValues]=useState({name:'',email:'',phone:'',message:'',city:'',company:'',specialization:''});
 const [resume,setResume]=useState<File|null>(null);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState('');
 const [tracking,setTracking]=useState('');
 const label=type==='careers'?'ارسال رزومه':type==='dealership'?'درخواست نمایندگی':type==='collaboration'?'درخواست همکاری سازمانی':type==='quote'?'استعلام قیمت محصول':'ارسال پیام';
 const change=(key:keyof typeof values)=>(e:ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setValues(old=>({...old,[key]:e.target.value}));
 async function submit(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setError('');setPending(true);
   try{
     const url=type==='careers'?'/api/public/applications':'/api/public/inquiries';
     let body:BodyInit;let headers:HeadersInit|undefined;
     if(type==='careers'){
       if(!resume)throw new Error('لطفاً فایل رزومه PDF یا DOCX را انتخاب کنید.');
       const data=new FormData();
       data.set('full_name',values.name);data.set('email',values.email);data.set('phone',values.phone);
       data.set('specialization',values.specialization);data.set('message',values.message);data.set('resume',resume);
       body=data;
     }else{
       body=JSON.stringify({kind:type==='dealership'?'dealership':type==='collaboration'?'collaboration':type==='quote'?'quote':'contact',
         product:productId||null,full_name:values.name,email:values.email,phone:values.phone,
         city:values.city,company:values.company,message:values.message});
       headers={'Content-Type':'application/json'};
     }
     const res=await fetch(url,{method:'POST',body,headers});
     const json=await res.json().catch(()=>({}));
     if(!res.ok){const first=Object.values(json)[0];throw new Error(typeof first==='string'?first:Array.isArray(first)?String(first[0]):'ثبت درخواست ناموفق بود؛ ورودی‌ها را بررسی کنید.');}
     setTracking(json.tracking_code||'');setValues({name:'',email:'',phone:'',message:'',city:'',company:'',specialization:''});setResume(null);
   }catch(e){setError(e instanceof Error?e.message:'ارتباط با سرور برقرار نشد.');}finally{setPending(false);}
 }
 if(tracking)return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-[#224333]" role="status">
   <CheckCircle2 size={26} className="mb-3"/><h3 className="m-0 text-lg font-semibold">درخواست با موفقیت ثبت شد.</h3>
   <p className="mt-2 text-sm">کد پیگیری: <strong dir="ltr" className="inline-block">{tracking}</strong></p>
   {type!=='careers'&&<Link href={`/track?code=${encodeURIComponent(tracking)}`} className="inline-block mt-2 underline underline-offset-4">پیگیری وضعیت درخواست</Link>}
   <button type="button" className="mt-5 block text-sm underline" onClick={()=>setTracking('')}>ثبت درخواست دیگر</button>
 </div>;
 return <form onSubmit={submit} className="grid gap-5" aria-label={label}>
   <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 sm:gap-y-5">
    <label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945]">نام و نام خانوادگی *<input autoComplete="name" className={input} required maxLength={140} value={values.name} onChange={change('name')} placeholder="نام شما"/></label>
    <label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945]">ایمیل *<input type="email" dir="ltr" autoComplete="email" className={`${input} text-left`} required maxLength={200} value={values.email} onChange={change('email')} placeholder="name@example.com"/></label>
    <label className={`grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945] ${type==='contact'||type==='quote'?'sm:col-span-2':''}`}>شماره تماس {type==='careers'?'*':'(اختیاری)'}<input type="tel" dir="ltr" autoComplete="tel" className={`${input} text-left`} maxLength={20} required={type==='careers'} value={values.phone} onChange={change('phone')} placeholder="09…"/></label>
    {(type==='dealership'||type==='collaboration')&&<label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945]">شهر موردنظر<input className={input} maxLength={100} value={values.city} onChange={change('city')} placeholder="نام شهر"/></label>}
    {(type==='dealership'||type==='collaboration')&&<label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945] sm:col-span-2">نام مجموعه/شرکت<input className={input} maxLength={140} value={values.company} onChange={change('company')} placeholder="نام مجموعه"/></label>}
    {type==='careers'&&<label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945]">زمینه تخصصی *<input className={input} required maxLength={150} value={values.specialization} onChange={change('specialization')} placeholder="حوزه تخصصی شما"/></label>}
    {type==='careers'&&<label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945] sm:col-span-2">رزومه PDF یا DOCX (حداکثر ۵ مگابایت) *<input type="file" accept=".pdf,.docx" required onChange={e=>setResume(e.target.files?.[0]||null)} className="min-h-12 w-full min-w-0 rounded-xl border border-dashed border-[#c9d0c9] bg-[#fafaf8] px-3 py-2 text-xs text-[#626a63] file:ml-3 file:rounded-lg file:border-0 file:bg-[#ecefea] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[#39413a]" /></label>}
    <label className="grid min-w-0 content-start gap-2 text-[12px] font-semibold leading-5 text-[#454945] sm:col-span-2">{type==='careers'?'توضیحات':type==='dealership'?'شرایط نمایندگی و اطلاعات کسب‌وکار':type==='collaboration'?'شرح همکاری پیشنهادی':type==='quote'?'توضیحات استعلام':'پیام شما'} {type!=='careers'?'*':''}
      <textarea rows={5} className={`${input} h-auto min-h-[136px] resize-y py-3 leading-7`} required={type!=='careers'} minLength={type==='careers'?0:8} maxLength={3000} value={values.message} onChange={change('message')} placeholder="پیام خود را اینجا بنویسید…"/></label>
   </div>
   {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
   <div className="flex flex-wrap items-center justify-start border-t border-[#e9ebe6] pt-4"><button disabled={pending} className="group inline-flex min-h-11 items-center gap-2.5 rounded-xl bg-[#252826] px-6 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#454945] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#454945] disabled:opacity-60" type="submit">{pending?<Loader2 size={17} className="animate-spin"/>:<ArrowUpLeft size={17}/>} {pending?'در حال ثبت...':label}</button></div>
 </form>;
}
