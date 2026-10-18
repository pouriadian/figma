'use client';

import {useState, type FormEvent, type ChangeEvent} from 'react';
import {ArrowUpLeft,Loader2,CheckCircle2} from 'lucide-react';
import Link from 'next/link';

type FormType='contact'|'careers'|'dealership'|'collaboration'|'quote';
const input='h-[54px] w-full rounded-2xl border border-[#e2e3dd] bg-[#fafaf8] px-4 text-sm text-[#2b302c] outline-none transition-colors duration-300 placeholder:text-[#a9ada7] focus:border-[#9ca59c] focus:bg-white';

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
   <div className="grid gap-5 sm:grid-cols-2">
    <label className="grid gap-2 text-[13px] font-medium text-[#454945]">نام و نام خانوادگی *<input autoComplete="name" className={input} required maxLength={140} value={values.name} onChange={change('name')}/></label>
    <label className="grid gap-2 text-[13px] font-medium text-[#454945]">ایمیل *<input type="email" dir="ltr" autoComplete="email" className={`${input} text-left`} required maxLength={200} value={values.email} onChange={change('email')}/></label>
   </div>
   <label className="grid gap-2 text-[13px] font-medium text-[#454945]">شماره تماس {type==='careers'?'*':'(اختیاری)'}<input type="tel" dir="ltr" autoComplete="tel" className={`${input} text-left`} maxLength={20} required={type==='careers'} value={values.phone} onChange={change('phone')}/></label>
   {(type==='dealership'||type==='collaboration')&&<label className="grid gap-2 text-[13px] font-medium text-[#454945]">شهر موردنظر<input className={input} maxLength={100} value={values.city} onChange={change('city')}/></label>}
   {(type==='dealership'||type==='collaboration')&&<label className="grid gap-2 text-[13px] font-medium text-[#454945]">نام مجموعه/شرکت<input className={input} maxLength={140} value={values.company} onChange={change('company')}/></label>}
   {type==='careers'&&<><label className="grid gap-2 text-[13px] font-medium text-[#454945]">زمینه تخصصی *<input className={input} required maxLength={150} value={values.specialization} onChange={change('specialization')}/></label>
    <label className="grid gap-2 text-[13px] font-medium text-[#454945]">رزومه PDF یا DOCX (حداکثر ۵ مگابایت) *<input type="file" accept=".pdf,.docx" required onChange={e=>setResume(e.target.files?.[0]||null)} className={`${input} h-auto py-3`} /></label></>}
   <label className="grid gap-2 text-[13px] font-medium text-[#454945]">{type==='careers'?'توضیحات':type==='dealership'?'شرایط نمایندگی و اطلاعات کسب‌وکار':type==='collaboration'?'شرح همکاری پیشنهادی':type==='quote'?'توضیحات استعلام':'پیام شما'} {type!=='careers'?'*':''}
     <textarea rows={5} className={`${input} h-auto min-h-[150px] resize-y py-4 leading-[2]`} required={type!=='careers'} minLength={type==='careers'?0:8} maxLength={3000} value={values.message} onChange={change('message')}/></label>
   {error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
   <div className="flex flex-wrap items-center gap-5"><button disabled={pending} className="group inline-flex min-h-12 items-center gap-3 rounded-full bg-[#252826] px-7 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:bg-[#454945] disabled:opacity-60" type="submit">{pending?<Loader2 size={17} className="animate-spin"/>:<ArrowUpLeft size={17}/>} {pending?'در حال ثبت...':label}</button></div>
 </form>;
}
