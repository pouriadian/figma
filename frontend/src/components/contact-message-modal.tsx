'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileUp,MessageCircle,X} from 'lucide-react';
import {ContactForm} from '@/components/contact-form';

type ModalFormType='contact'|'careers'|'dealership';
export function ContactMessageModal({type='contact',variant='solid'}:{type?:ModalFormType;variant?:'solid'|'glass'}){
 const [open,setOpen]=useState(false);
 const dialogRef=useRef<HTMLElement>(null);
 const isCareers=type==='careers';
 const isDealership=type==='dealership';
 const buttonStyle=variant==='glass'
   ?'border-white/35 bg-white/15 text-white shadow-[0_10px_28px_rgba(0,0,0,.14)] backdrop-blur-xl hover:bg-white/25 focus-visible:outline-white'
   :'border-white/15 bg-[#252927] text-white shadow-[0_10px_28px_rgba(37,41,39,.16)] hover:bg-[#414741] focus-visible:outline-[#252927]';
 useEffect(()=>{
   if(!open)return;
   const previousOverflow=document.body.style.overflow;
   const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
   document.body.style.overflow='hidden';
   dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
   const onKeyDown=(event:KeyboardEvent)=>{
     if(event.key==='Escape'){setOpen(false);return}
     if(event.key==='Tab'&&dialogRef.current){
       const focusable=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]'));
       if(!focusable.length)return;
       const first=focusable[0],last=focusable[focusable.length-1];
       if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
       else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
     }
   };
   window.addEventListener('keydown',onKeyDown);
   return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown);previousFocus?.focus()};
 },[open]);

 return <>
   <button type="button" onClick={()=>setOpen(true)} className={`group inline-flex min-h-12 items-center gap-3 rounded-full border px-7 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 ${buttonStyle}`}>
     {isCareers?<FileUp size={18} className="transition-transform duration-300 group-hover:scale-110"/>:<MessageCircle size={18} className="transition-transform duration-300 group-hover:scale-110"/>}{isCareers?'ارسال رزومه':isDealership?'درخواست نمایندگی':'ارسال پیام'}
   </button>
   {open&&createPortal(<div className="fixed inset-0 z-[500] flex items-center justify-center overflow-y-auto bg-[#101411]/70 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
     <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="contact-message-title" dir="rtl" className="relative my-auto max-h-[calc(100dvh-24px)] w-full max-w-[680px] overflow-y-auto overscroll-contain rounded-[24px] border border-white/75 bg-[#fbfbf9] p-5 shadow-[0_28px_90px_rgba(0,0,0,.34)] sm:max-h-[calc(100dvh-48px)] sm:rounded-[28px] sm:p-8">
       <button type="button" onClick={()=>setOpen(false)} aria-label={`بستن پنجره ${isCareers?'ارسال رزومه':isDealership?'درخواست نمایندگی':'ارسال پیام'}`} className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-[#e1e4de] bg-white text-[#424943] transition hover:bg-[#f0f2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#303832] sm:left-6 sm:top-6"><X size={20}/></button>
       <p className="mb-2 pl-12 text-[10px] font-semibold tracking-[.18em] text-[#a82c39]" dir="ltr">FAROMID GROUP / {isCareers?'CAREERS':isDealership?'DEALERSHIP':'CONTACT'}</p>
       <h2 id="contact-message-title" className="mb-2 mt-0 pl-12 text-2xl font-semibold text-[#252a26]">{isCareers?'ارسال رزومه':isDealership?'درخواست نمایندگی':'ارسال پیام'}</h2>
       <p className="mb-6 mt-0 text-sm leading-7 text-[#727a73]">{isCareers?'اطلاعات خود را وارد کنید و رزومه PDF یا DOCX را پیوست کنید.':isDealership?'اطلاعات مجموعه و شهر موردنظر را وارد کنید تا درخواست شما بررسی شود.':'پیام خود را برای ما بنویسید؛ کارشناسان فرامید با شما تماس می‌گیرند.'}</p>
       <ContactForm type={type}/>
     </section>
   </div>,document.body)}
 </>;
}
