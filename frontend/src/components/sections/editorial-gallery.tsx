'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {ArrowUpLeft, ChevronLeft, ChevronRight, X} from 'lucide-react';

type GalleryItem={src:string;title:string;caption?:string};
export function EditorialGallery({items}: {items:GalleryItem[]}){
 const [selected,setSelected]=useState<number|null>(null);
 useEffect(()=>{if(selected===null)return;
   const before=document.body.style.overflow;document.body.style.overflow='hidden';
   const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(null);if(event.key==='ArrowLeft')setSelected(i=>i===null?null:(i+1)%items.length);if(event.key==='ArrowRight')setSelected(i=>i===null?null:(i-1+items.length)%items.length);};
   window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=before;window.removeEventListener('keydown',onKey);};
 },[selected,items.length]);
 return <>
   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item,i)=><button type="button" key={`${item.src}-${i}`} onClick={()=>setSelected(i)} className={`group relative min-h-[275px] overflow-hidden rounded-[24px] bg-[#e2e4df] text-right sm:min-h-[350px] ${i%5===0&&items.length>=5?'lg:row-span-2 lg:min-h-[725px]':''}`} aria-label={`مشاهده تصویر ${item.title}`}>
        <Image fill src={item.src} alt={item.title} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.045]"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent"/><div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4 text-white"><div><span className="text-[10px] tracking-wider text-white/60 [direction:ltr]">FAROMID / 0{i+1}</span><h2 className="mt-2 mb-0 text-base font-semibold">{item.title}</h2></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/65 bg-black/15 transition-all group-hover:bg-white group-hover:text-[#252725]"><ArrowUpLeft size={17}/></span></div>
      </button>)}
   </div>
   {selected!==null&&<div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#111]/95 p-4 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="نمایش تصویر گالری" onClick={()=>setSelected(null)}>
     <button type="button" onClick={()=>setSelected(null)} className="absolute top-5 left-5 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20" aria-label="بستن تصویر"><X size={21}/></button>
     <button type="button" className="absolute top-1/2 right-3 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25 sm:right-6" aria-label="تصویر قبلی" onClick={e=>{e.stopPropagation();setSelected(v=>v===null?null:(v-1+items.length)%items.length)}}><ChevronRight size={21}/></button>
     <div className="relative h-[min(75vh,950px)] w-full max-w-[1200px]" onClick={e=>e.stopPropagation()}><Image fill unoptimized src={items[selected].src} alt={items[selected].title} sizes="90vw" className="object-contain"/><span className="absolute right-0 -bottom-8 text-sm text-white/65">{items[selected].title}</span></div>
     <button type="button" className="absolute top-1/2 left-3 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25 sm:left-6" aria-label="تصویر بعدی" onClick={e=>{e.stopPropagation();setSelected(v=>v===null?null:(v+1)%items.length)}}><ChevronLeft size={21}/></button>
     <span className="absolute bottom-5 left-5 font-mono text-xs text-white/45" dir="ltr">{selected+1} / {items.length}</span>
   </div>}
 </>;
}
