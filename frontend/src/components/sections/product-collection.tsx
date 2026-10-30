'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,Search,X} from 'lucide-react';
import type {ProductApiItem,ProductCategory} from '@/lib/api';
import {ProductCard} from '@/components/ui/product-card';

const PAGE_SIZE=12;
const normalize=(value:string)=>value.trim().toLocaleLowerCase('fa').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[۰-۹]/g,digit=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g,digit=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export function ProductCollection({products,category}:{products:ProductApiItem[];category:ProductCategory}){
  const [query,setQuery]=useState('');
  const [debouncedQuery,setDebouncedQuery]=useState('');
  const [page,setPage]=useState(1);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    setQuery(params.get('search')||'');
  },[]);
  useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query),250);return()=>window.clearTimeout(timer)},[query]);
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(query.trim())url.searchParams.set('search',query.trim());else url.searchParams.delete('search');
    url.searchParams.set('by','collection');
    url.searchParams.set('category',category.slug);
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  },[query,category.slug]);

  const visible=useMemo(()=>{
    const needle=normalize(debouncedQuery);
    return products.filter(product=>product.category_slug===category.slug&&(!needle||normalize(`${product.name} ${product.code} ${product.model}`).includes(needle)));
  },[products,category.slug,debouncedQuery]);
  const pageCount=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,pageCount);
  const paginated=visible.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const clear=()=>{setQuery('');setDebouncedQuery('');setPage(1)};

  return <section dir="rtl" className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
    <Link href="/products" className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm text-[#707970] transition hover:text-[#252b26]"><ArrowRight size={17}/> بازگشت به دسته‌بندی محصولات</Link>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><span dir="ltr" className="text-[9px] font-semibold tracking-[.28em] text-[#888d86]">PRODUCT COLLECTION</span><h2 className="mt-2 text-2xl font-extrabold text-[#222522] sm:text-3xl">{category.name}</h2></div>
      <span aria-live="polite" className="rounded-full border border-[#e7e8e3] bg-white px-4 py-2 text-xs text-[#737a74]">{visible.length.toLocaleString('fa-IR')} محصول</span>
    </header>
    <div className="mb-7 flex min-h-14 items-center gap-3 rounded-2xl border border-[#e5e6e1] bg-white px-4 shadow-sm focus-within:border-[#b9beb7] focus-within:ring-2 focus-within:ring-[#dce0d8]">
      <Search size={18} className="shrink-0 text-[#858a84]"/><label className="sr-only" htmlFor="product-category-search">جستجو بر اساس نام یا کد محصول</label>
      <input id="product-category-search" type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="جستجو بر اساس نام یا کد محصول" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>
      {query&&<button type="button" onClick={clear} aria-label="پاک کردن جستجو" className="grid h-9 w-9 place-items-center rounded-full text-[#7b817b] transition hover:bg-[#eef0eb]"><X size={16}/></button>}
    </div>
    {paginated.length?<div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{paginated.map((product,index)=><ProductCard key={product.id??product.slug} product={product} priority={index<4}/>)}</div>:<div className="grid min-h-52 place-items-center rounded-[24px] border border-dashed border-[#d9ddd7] bg-white p-8 text-center text-sm text-[#747b75]">{products.some(product=>product.category_slug===category.slug)?'محصولی با این نام یا کد پیدا نشد.':'هنوز محصولی در این دسته ثبت نشده است.'}</div>}
    {pageCount>1&&<nav aria-label="صفحه‌بندی محصولات" className="mt-8 flex items-center justify-center gap-2 border-t border-[#e5e7e1] pt-5"><button type="button" disabled={currentPage<=1} onClick={()=>setPage(value=>value-1)} className="min-h-10 rounded-full border px-4 text-sm disabled:opacity-40">قبلی</button><span className="px-3 text-xs text-[#747b75]">صفحه {currentPage.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span><button type="button" disabled={currentPage>=pageCount} onClick={()=>setPage(value=>value+1)} className="min-h-10 rounded-full border px-4 text-sm disabled:opacity-40">بعدی</button></nav>}
  </section>;
}
