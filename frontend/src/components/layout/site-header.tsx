'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,Menu,X} from 'lucide-react';
import {brand} from '@/lib/media';
import {links} from '@/lib/constants';

const primary=links.filter(item=>['/','/products','/textures','/gallery','/about'].includes(item.href));
const secondary=links.filter(item=>!primary.some(main=>main.href===item.href));

/** Same glass navbar on every public page, including the homepage. */
export function SiteHeader(){
  const pathname=usePathname();
  const [scrolled,setScrolled]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const moreRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const update=()=>setScrolled(window.scrollY>44);
    update();
    window.addEventListener('scroll',update,{passive:true});
    return()=>window.removeEventListener('scroll',update);
  },[]);
  useEffect(()=>{setMobileOpen(false);setMoreOpen(false)},[pathname]);
  useEffect(()=>{
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMobileOpen(false);setMoreOpen(false)}};
    const closeOnPointer=(event:PointerEvent)=>{
      if(moreRef.current&&!moreRef.current.contains(event.target as Node))setMoreOpen(false);
    };
    window.addEventListener('keydown',closeOnEscape);
    window.addEventListener('pointerdown',closeOnPointer);
    return()=>{window.removeEventListener('keydown',closeOnEscape);window.removeEventListener('pointerdown',closeOnPointer)};
  },[]);
  const navItem=(href:string)=>pathname===href?'bg-white/12 text-white after:scale-x-100':'text-white/75 hover:bg-white/10 hover:text-white after:scale-x-0 hover:after:scale-x-100';
  return <header className="sticky top-0 z-[100] h-[90px] w-full sm:h-[98px]" aria-label="سربرگ وب‌سایت">
    <div className={`mx-auto flex w-full max-w-[1600px] items-start px-3 transition-[padding] duration-300 ease-out sm:px-7 lg:px-10 ${scrolled?'pt-2':'pt-3 sm:pt-4'}`}>
      <div dir="ltr" className={`relative flex w-full items-center justify-between gap-4 rounded-[22px] border border-white/20 px-4 text-white shadow-[0_14px_38px_rgba(0,0,0,.24)] backdrop-blur-[20px] transition-[height,background-color,border-radius,box-shadow] duration-300 ease-out sm:px-6 ${scrolled?'h-[58px] rounded-[17px] bg-[#0a0b0e]/95 shadow-[0_9px_28px_rgba(0,0,0,.28)]':'h-[68px] bg-[#0b0d10]/80 sm:h-[72px]'}`}>
        <Link href="/" aria-label="فرامید - صفحه اصلی" className="relative z-10 inline-flex shrink-0 items-center rounded-lg py-1" onClick={()=>setMobileOpen(false)}>
          <Image src={brand.logo} alt="Faromid Group" width={273} height={72} priority className={`h-auto w-[137px] object-contain transition-[width] duration-300 sm:w-[158px] ${scrolled?'sm:!w-[145px]':''}`}/>
        </Link>
        <nav aria-label="فهرست اصلی" dir="rtl" className="hidden min-w-0 items-center gap-1 xl:flex 2xl:gap-2">
          {primary.map(item=><Link href={item.href} key={item.href} aria-current={pathname===item.href?'page':undefined}
            className={`relative inline-flex min-h-10 items-center rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 after:absolute after:inset-x-4 after:bottom-1 after:h-[2px] after:origin-center after:rounded-full after:bg-[#e12c38] after:transition-transform ${navItem(item.href)}`}>
            {item.label}
          </Link>)}
          <div ref={moreRef} className="relative">
            <button type="button" aria-expanded={moreOpen} aria-controls="faromid-nav-more" onClick={()=>setMoreOpen(v=>!v)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              بیشتر <ChevronDown size={15} className={`transition-transform duration-200 ${moreOpen?'rotate-180':''}`}/>
            </button>
            {moreOpen&&<div id="faromid-nav-more" className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-white/20 bg-[#17191d]/95 p-2 shadow-2xl backdrop-blur-xl">
              {secondary.map(item=><Link key={item.href} href={item.href} onClick={()=>setMoreOpen(false)} aria-current={pathname===item.href?'page':undefined}
                className={`block rounded-xl px-4 py-3 text-[13px] transition-colors ${pathname===item.href?'bg-white/15 text-white':'text-white/80 hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>)}
            </div>}
          </div>
        </nav>
        <button type="button" aria-label={mobileOpen?'بستن منو':'باز کردن منو'} aria-controls="faromid-mobile-menu" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:outline-white xl:hidden">
          {mobileOpen?<X size={22}/>:<Menu size={22}/>}
        </button>
        {mobileOpen&&<nav id="faromid-mobile-menu" aria-label="فهرست موبایل" dir="rtl" className="absolute top-[calc(100%+10px)] right-0 left-0 z-20 grid max-h-[calc(100dvh-110px)] grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-white/15 bg-[#121418]/95 p-3 shadow-2xl backdrop-blur-[24px] sm:grid-cols-2 xl:hidden">
          {links.map(item=><Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} aria-current={pathname===item.href?'page':undefined}
            className={`rounded-xl px-4 py-3 text-sm transition-colors ${pathname===item.href?'bg-[#bd2631]/25 text-white':'text-white/85 hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>)}
        </nav>}
      </div>
    </div>
  </header>;
}
