'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {ArrowUpLeft, ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut} from 'lucide-react';

type GalleryItem={src:string;title:string;caption?:string};
const DEFAULT_PAGE_SIZE=9;
export function EditorialGallery({items,zoomable=false,pageSize=DEFAULT_PAGE_SIZE}: {items:GalleryItem[];zoomable?:boolean;pageSize?:number}){
 const [selected,setSelected]=useState<number|null>(null);
 const [zoom,setZoom]=useState(1);
 const [page,setPage]=useState(1);
 const pageCount=Math.max(1,Math.ceil(items.length/pageSize));
 const pageItems=items.slice((page-1)*pageSize,page*pageSize);
 useEffect(()=>setPage(current=>Math.min(current,pageCount)),[pageCount]);
 useEffect(()=>setZoom(1),[selected]);
 useEffect(()=>{if(selected===null)return;
   const before=document.body.style.overflow;document.body.style.overflow='hidden';
   const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(null);if(event.key==='ArrowLeft')setSelected(i=>i===null?null:(i+1)%items.length);if(event.key==='ArrowRight')setSelected(i=>i===null?null:(i-1+items.length)%items.length);if(zoomable&&(event.key==='+'||event.key==='='))setZoom(v=>Math.min(4,v+.25));if(zoomable&&event.key==='-')setZoom(v=>Math.max(1,v-.25));if(zoomable&&event.key==='0')setZoom(1);};
   window.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=before;window.removeEventListener('keydown',onKey);};
 },[selected,items.length]);
 return <>
   <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {pageItems.map((item,i)=>{const itemIndex=(page-1)*pageSize+i;return <button type="button" key={`${item.src}-${itemIndex}`} onClick={()=>setSelected(itemIndex)} className={`group relative min-h-[275px] overflow-hidden rounded-[24px] bg-[#e2e4df] text-right sm:min-h-[350px] ${i%5===0&&pageItems.length>=5?'lg:row-span-2 lg:min-h-[725px]':''}`} aria-label={`مشاهده تصویر ${item.title}`}>
        <Image fill src={item.src} alt={item.title} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.045]"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent"/><div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4 text-white"><div><span className="text-[10px] tracking-wider text-white/60 [direction:ltr]">FAROMID / {String(itemIndex+1).padStart(2,'0')}</span><h2 className="mt-2 mb-0 text-base font-semibold">{item.title}</h2></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/65 bg-black/15 transition-all group-hover:bg-white group-hover:text-[#252725]"><ArrowUpLeft size={17}/></span></div>
      </button>})}
   </div>
   {pageCount>1&&<nav aria-label="صفحه‌بندی تصاویر" className="mt-10 flex flex-col items-center justify-center gap-4 border-t border-[#e5e7e1] px-4 pt-5 text-center">
     <p className="m-0 text-center text-xs text-[#747b75]">صفحه {page.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')} · نمایش {((page-1)*pageSize+1).toLocaleString('fa-IR')} تا {Math.min(page*pageSize,items.length).toLocaleString('fa-IR')} تصویر</p>
     <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
       <button type="button" onClick={()=>setPage(value=>Math.max(1,value-1))} disabled={page===1} aria-label="صفحه قبلی" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 text-xs font-medium text-[#454b46] shadow-[0_4px_16px_rgba(34,40,35,.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40"><ChevronLeft size={16}/><span className="sr-only sm:not-sr-only">قبلی</span></button>
       {Array.from({length:pageCount},(_,index)=>index+1).map(number=><button key={number} type="button" onClick={()=>setPage(number)} aria-current={page===number?'page':undefined} aria-label={`صفحه ${number}`} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-xs font-medium backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[.98] ${page===number?'border-[#292d2a]/75 bg-[#292d2a]/85 text-white shadow-[0_8px_24px_rgba(32,38,33,.18)]':'border-white/70 bg-white/65 text-[#454b46] shadow-[0_4px_16px_rgba(34,40,35,.07)] hover:bg-white/90'}`}>{number.toLocaleString('fa-IR')}</button>)}
       <button type="button" onClick={()=>setPage(value=>Math.min(pageCount,value+1))} disabled={page===pageCount} aria-label="صفحه بعدی" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 text-xs font-medium text-[#454b46] shadow-[0_4px_16px_rgba(34,40,35,.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40"><span className="sr-only sm:not-sr-only">بعدی</span><ChevronRight size={16}/></button>
     </div>
   </nav>}
   {selected!==null&&<div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#111]/95 p-4 text-white backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="نمایش تصویر گالری" onClick={()=>setSelected(null)}>
     <button type="button" onClick={()=>setSelected(null)} className="absolute top-5 left-5 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 transition hover:bg-white/20" aria-label="بستن تصویر"><X size={21}/></button>
     <button type="button" className="absolute top-1/2 right-3 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25 sm:right-6" aria-label="تصویر قبلی" onClick={e=>{e.stopPropagation();setSelected(v=>v===null?null:(v-1+items.length)%items.length)}}><ChevronRight size={21}/></button>
     <div className="relative h-[min(75vh,950px)] w-full max-w-[1200px] overflow-hidden" onClick={e=>e.stopPropagation()} onWheel={event=>{if(!zoomable)return;event.preventDefault();setZoom(v=>Math.min(4,Math.max(1,v+(event.deltaY<0?.2:-.2))))}}><Image fill unoptimized src={items[selected].src} alt={items[selected].title} sizes="90vw" style={{transform:`scale(${zoom})`}} className="object-contain transition-transform duration-200"/><span className="absolute right-0 -bottom-8 text-sm text-white/65">{items[selected].title}</span></div>
     {zoomable&&<div dir="ltr" aria-label="کنترل بزرگ‌نمایی تصویر" className="absolute top-5 right-20 z-10 flex h-11 items-center gap-1 rounded-full border border-white/20 bg-[#292929]/80 px-1.5 backdrop-blur-md">
       <button type="button" onClick={e=>{e.stopPropagation();setZoom(v=>Math.max(1,v-.25))}} disabled={zoom<=1} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-40" aria-label="کوچک‌نمایی"><ZoomOut size={17}/></button>
       <span className="min-w-10 text-center font-mono text-xs text-white/85">{Math.round(zoom*100)}%</span>
       <button type="button" onClick={e=>{e.stopPropagation();setZoom(v=>Math.min(4,v+.25))}} disabled={zoom>=4} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-40" aria-label="بزرگ‌نمایی"><ZoomIn size={17}/></button>
       <button type="button" onClick={e=>{e.stopPropagation();setZoom(1)}} disabled={zoom===1} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-40" aria-label="بازنشانی بزرگ‌نمایی"><RotateCcw size={15}/></button>
     </div>}
     <button type="button" className="absolute top-1/2 left-3 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25 sm:left-6" aria-label="تصویر بعدی" onClick={e=>{e.stopPropagation();setSelected(v=>v===null?null:(v+1)%items.length)}}><ChevronLeft size={21}/></button>
     <span className="absolute bottom-5 left-5 font-mono text-xs text-white/45" dir="ltr">{selected+1} / {items.length}</span>
   </div>}
 </>;
}
