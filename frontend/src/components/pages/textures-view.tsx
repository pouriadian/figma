'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {Search,X,ArrowUpLeft} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import type {TextureApiItem} from '@/lib/api';
import {MediaImage} from '@/components/ui/media-image';
import {TexturePreview} from '@/components/ui/texture-preview';

function norm(v:string){return v.trim().toLocaleLowerCase('fa').replace(/[يى]/g,'ی').replace(/ك/g,'ک')}
export function TexturesView({developmentItems,initialRealTextures}:{developmentItems:TextureApiItem[];initialRealTextures:TextureApiItem[]}){
 const [query,setQuery]=useState(''),[debounced,setDebounced]=useState(''),[category,setCategory]=useState('');
 const items=[...initialRealTextures.filter(item=>!developmentItems.some(demo=>demo.slug===item.slug)),...developmentItems];
 useEffect(()=>{const timer=window.setTimeout(()=>setDebounced(query),250);return()=>window.clearTimeout(timer)},[query]);
 const categories=[...new Set(items.map(item=>item.category).filter(Boolean))];
 const visible=useMemo(()=>items.filter(item=>(!category||item.category===category)&&(!norm(debounced)||norm(`${item.name} ${item.code}`).includes(norm(debounced)))),[items,category,debounced]);
 const clear=()=>{setQuery('');setDebounced('');setCategory('')};
 return <SiteShell><main dir="rtl" className="bg-[#f8f7f4] pb-16">
  <section className="border-b border-[#e7e5df] bg-white py-12 sm:py-16"><Container><h1 className="text-3xl font-extrabold text-[#222522] sm:text-5xl">بافت‌های فرامید</h1><p className="mt-4 max-w-2xl text-sm leading-8 text-[#747a73]">بافت موردنظر خود را انتخاب کنید و سطحی متناسب با سلیقه و طراحی پروژه‌تان بسازید.</p></Container></section>
  <Container className="pt-8 sm:pt-12"><div className="mb-7 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e5e6e1] bg-white p-3 shadow-sm"><label className="flex min-h-11 flex-1 items-center gap-3 px-2"><Search size={18} className="text-[#858a84]"/><span className="sr-only">جستجوی نام یا کد بافت</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="نام یا کد بافت را جستجو کنید" className="w-full bg-transparent text-sm outline-none"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="پاک کردن جستجو"><X size={17}/></button>}</label>{categories.length>0&&<select aria-label="دسته‌بندی بافت" value={category} onChange={e=>setCategory(e.target.value)} className="min-h-11 rounded-xl border border-[#e5e6e1] bg-white px-3 text-sm"><option value="">همه دسته‌ها</option>{categories.map(c=><option key={c}>{c}</option>)}</select>}{(query||category)&&<button type="button" onClick={clear} className="px-3 text-sm text-[#a63340]">حذف فیلترها</button>}</div>
   {visible.length?<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{visible.map(item=><Link key={item.id} href={`/textures/${item.slug}`} className="group block h-full overflow-hidden rounded-[16px] border border-[#e8e9e5] bg-white shadow-[0_5px_24px_rgba(27,31,27,.045)] transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#c7cdc6] hover:shadow-[0_17px_36px_rgba(27,31,27,.11)] sm:rounded-[21px]"><div className="relative aspect-square overflow-hidden bg-[#eeede8]">{item.is_demo?<TexturePreview slug={item.slug} className="h-full w-full"/>:<MediaImage src={item.image} alt={`بافت ${item.name}`} sizes="(max-width:640px) 50vw,25vw" className="transition-transform duration-500 group-hover:scale-[1.035]"/>}<span dir="ltr" className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 font-mono text-[10px] text-[#444b45] backdrop-blur-sm">{item.code}</span></div><div className="flex min-h-[76px] items-center justify-between gap-2 p-3 sm:p-4"><div className="min-w-0"><h2 className="m-0 truncate text-sm font-semibold text-[#262c28] sm:text-base">{item.name}</h2>{item.category&&<span className="mt-1 block text-[11px] text-[#747b75]">{item.category}</span>}<span className="mt-2 block text-[11px] text-[#747b75]">مشاهده جزئیات</span></div><ArrowUpLeft size={18} className="shrink-0 text-[#747b75] transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"/></div></Link>)}</div>:<div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-[#d9ddd7] bg-white p-8 text-center text-sm text-[#747b75]">{items.length?'بافتی با این جستجو یا فیلتر پیدا نشد.':'هنوز بافتی برای نمایش ثبت نشده است.'}</div>}
  </Container></main></SiteShell>
}
