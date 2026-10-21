'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ExternalLink,Link2,X} from 'lucide-react';

const externalLinks=[
  {label:'صنایع چوب ایران',url:'https://chobiran.com'},
  {label:'اتحادیه تولیدکنندگان و صادرکنندگان مبلمان ایران',url:'https://furniran.com'},
  {label:'شهرداری اصفهان',url:'https://www.isfahan.ir'},
  {label:'گمرک جمهوری اسلامی ایران',url:'https://www.irica.ir'},
  {label:'وزارت صنعت، معدن و تجارت',url:'https://www.mimt.gov.ir'},
  {label:'سازمان ملی استاندارد ایران',url:'https://www.inso.gov.ir'},
  {label:'سامانه جامع تجارت',url:'https://www.ntsw.ir'},
  {label:'بانک مرکزی',url:'https://www.cbi.ir'},
  {label:'اتاق بازرگانی تهران',url:'https://www.tccim.ir'},
  {label:'اتاق بازرگانی ایران',url:'https://iccima.ir'},
  {label:'اتاق بازرگانی ایران و آلمان',url:'https://www.diihk.com'},
  {label:'اتاق بازرگانی ایران و ایتالیا',url:'https://iiccim.ir'},
  {label:'اتاق بازرگانی ایران و اتریش',url:'https://www.iajcc.ir'},
  {label:'اتاق بازرگانی ایران و چین',url:'https://iccci.ir'},
  {label:'بهین‌یاب',url:'http://www.behinyab.ir'},
  {label:'بازار طلا و ارز',url:'https://www.tgju.org'},
];

export function FooterLinksModal(){
  const [open,setOpen]=useState(false);
  const dialogRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previousOverflow=document.body.style.overflow;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    document.body.style.overflow='hidden';
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown);previousFocus?.focus()};
  },[open]);

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/[.08] px-3.5 text-xs font-medium text-white transition hover:border-white/40 hover:bg-white/[.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"><Link2 size={14}/>پیوندها</button>
    {open&&createPortal(<div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}} className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto bg-[#101411]/75 p-3 backdrop-blur-sm sm:p-6">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="footer-links-title" dir="rtl" className="relative my-auto max-h-[calc(100dvh-32px)] w-full max-w-[620px] overflow-y-auto rounded-[20px] border border-white/70 bg-[#fafbf9] p-4 text-[#252a26] shadow-[0_24px_70px_rgba(0,0,0,.32)] sm:max-h-[min(78dvh,680px)] sm:rounded-[24px] sm:p-5">
        <button type="button" onClick={()=>setOpen(false)} aria-label="بستن پنجره پیوندها" className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[#e1e4de] bg-white text-[#424943] transition hover:bg-[#f0f2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#303832] sm:left-5 sm:top-5"><X size={18}/></button>
        <p dir="ltr" className="mb-1.5 pl-11 text-[9px] font-semibold tracking-[.2em] text-[#8b4b4d]">FAROMID / RESOURCES</p>
        <h2 id="footer-links-title" className="mb-1.5 mt-0 pl-11 text-lg font-semibold sm:text-xl">پیوندهای مرتبط</h2>
        <p className="mb-4 mt-0 text-xs leading-6 text-[#727a73]">دسترسی به وب‌سایت سازمان‌ها و نهادهای مرتبط با صنعت.</p>
        <ul className="m-0 grid list-none grid-cols-1 gap-1.5 p-0 sm:grid-cols-2">
          {externalLinks.map((item,index)=><li key={item.label}>
            <a href={item.url!} target="_blank" rel="noopener noreferrer" className="group flex min-h-10 items-center justify-between gap-3 rounded-lg border border-[#e5e8e2] bg-white px-3 py-2 text-xs text-[#38403a] transition hover:border-[#c6cec5] hover:bg-[#f4f6f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#59675c]"><span className="flex min-w-0 items-center gap-2"><span className="text-[10px] text-[#969d96]">{String(index+1).padStart(2,'0')}</span><span>{item.label}</span></span><ExternalLink size={14} className="shrink-0 text-[#8a938b] transition group-hover:text-[#343d36]"/></a>
          </li>)}
        </ul>
      </section>
    </div>,document.body)}
  </>;
}
