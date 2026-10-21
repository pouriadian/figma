'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,Menu,X} from 'lucide-react';
import {brand} from '@/lib/media';
import {links} from '@/lib/constants';

const primary=links.filter(item=>['/','/products','/gallery','/about'].includes(item.href));
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
  return <header className="sticky top-0 z-[100] h-[68px] w-full sm:h-[76px]" aria-label="سربرگ وب‌سایت">
    <div className="mx-auto flex w-[90%] max-w-[1600px] items-start pt-1">
      <div dir="ltr" className={`relative flex w-full items-center justify-between gap-2 rounded-full border border-white/30 bg-[#202124]/65 px-3 text-white shadow-[0_10px_32px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.14)] backdrop-blur-[22px] transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] sm:gap-4 sm:px-5 ${scrolled?'h-[50px] -translate-y-1 border-white/40 bg-[#17191d]/85 shadow-[0_15px_40px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.18)] sm:h-[52px]':'h-[54px] translate-y-0 sm:h-[56px]'}`}>
        <Link href="/" aria-label="فرامید - صفحه اصلی" className="relative z-10 ml-[5%] inline-flex shrink-0 items-center rounded-lg py-1" onClick={()=>setMobileOpen(false)}>
          <Image src={brand.logo} alt="Faromid Group" width={273} height={72} priority className={`h-auto w-[120px] origin-left object-contain transition-transform duration-500 ease-out sm:w-[150px] ${scrolled?'scale-[.94]':'scale-100'}`}/>
        </Link>
        <span aria-hidden="true" className="hidden h-7 w-px shrink-0 bg-white/30 sm:block" />
        <nav aria-label="فهرست اصلی" dir="rtl" className="ml-auto hidden min-w-0 items-center gap-1 xl:mr-[5%] xl:flex 2xl:gap-2">
          {primary.map(item=><Link href={item.href} key={item.href} aria-current={pathname===item.href?'page':undefined}
            className={`relative inline-flex min-h-10 items-center rounded-xl px-3 text-[13px] font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 after:absolute after:inset-x-4 after:bottom-1 after:h-[2px] after:origin-center after:rounded-full after:bg-[#e12c38] after:transition-transform after:duration-300 ${navItem(item.href)}`}>
            {item.label}
          </Link>)}
          <div ref={moreRef} className="relative">
            <button type="button" aria-expanded={moreOpen} aria-controls="faromid-nav-more" onClick={()=>setMoreOpen(v=>!v)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] text-white/80 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/10 hover:text-white active:scale-95">
              بیشتر <ChevronDown size={15} className={`transition-transform duration-200 ${moreOpen?'rotate-180':''}`}/>
            </button>
            {moreOpen&&<div id="faromid-nav-more" className="faromid-nav-dropdown absolute right-0 top-full mt-3 w-56 rounded-2xl border border-white/20 bg-[#17191d]/95 p-2 shadow-2xl backdrop-blur-xl">
              {secondary.map(item=><Link key={item.href} href={item.href} onClick={()=>setMoreOpen(false)} aria-current={pathname===item.href?'page':undefined}
                className={`block rounded-xl px-4 py-3 text-[13px] transition-colors ${pathname===item.href?'bg-white/15 text-white':'text-white/80 hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>)}
            </div>}
          </div>
        </nav>
        <button type="button" aria-label={mobileOpen?'بستن منو':'باز کردن منو'} aria-controls="faromid-mobile-menu" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(v=>!v)}
          className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/30 bg-white/5 text-white transition-all duration-300 hover:rotate-3 hover:bg-white/15 active:scale-90 focus-visible:outline-white xl:hidden">
          {mobileOpen?<X size={22} className="transition-transform duration-300"/>:<Menu size={22} className="transition-transform duration-300"/>}
        </button>
        {mobileOpen&&<nav id="faromid-mobile-menu" aria-label="فهرست موبایل" dir="rtl" className="faromid-nav-dropdown absolute top-[calc(100%+10px)] right-0 left-0 z-20 grid max-h-[calc(100dvh-110px)] grid-cols-1 gap-1 overflow-y-auto rounded-2xl border border-white/15 bg-[#121418]/95 p-3 shadow-2xl backdrop-blur-[24px] sm:grid-cols-2 xl:hidden">
          {links.map(item=><Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} aria-current={pathname===item.href?'page':undefined}
            className={`rounded-xl px-4 py-3 text-sm transition-colors ${pathname===item.href?'bg-[#bd2631]/25 text-white':'text-white/85 hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>)}
        </nav>}
      </div>
    </div>
  </header>;
}
