'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,Menu,X} from 'lucide-react';
import {brand} from '@/lib/media';
import {links} from '@/lib/constants';

const primary=links.filter(item=>['/','/products','/textures','/gallery','/contact','/about'].includes(item.href));
const secondary=links.filter(item=>!primary.some(main=>main.href===item.href));

/** Same glass navbar on every public page, including the homepage. */
export function SiteHeader(){
  const pathname=usePathname();
  const [scrolled,setScrolled]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [mobileMoreOpen,setMobileMoreOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const headerRef=useRef<HTMLElement>(null);
  const menuButtonRef=useRef<HTMLButtonElement>(null);
  const moreRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const update=()=>setScrolled(window.scrollY>44);
    update();
    window.addEventListener('scroll',update,{passive:true});
    return()=>window.removeEventListener('scroll',update);
  },[]);
  useEffect(()=>{setMobileOpen(false);setMobileMoreOpen(false);setMoreOpen(false)},[pathname]);
  useEffect(()=>{
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(mobileOpen){setMobileOpen(false);menuButtonRef.current?.focus();}
        setMoreOpen(false);
      }
    };
    const closeOnPointer=(event:PointerEvent)=>{
      if(headerRef.current&&!headerRef.current.contains(event.target as Node))setMobileOpen(false);
      if(moreRef.current&&!moreRef.current.contains(event.target as Node))setMoreOpen(false);
    };
    const closeOnDesktop=()=>{if(window.matchMedia('(min-width: 1024px)').matches)setMobileOpen(false)};
    window.addEventListener('keydown',closeOnEscape);
    window.addEventListener('pointerdown',closeOnPointer);
    window.addEventListener('resize',closeOnDesktop,{passive:true});
    return()=>{window.removeEventListener('keydown',closeOnEscape);window.removeEventListener('pointerdown',closeOnPointer);window.removeEventListener('resize',closeOnDesktop)};
  },[mobileOpen]);
  useEffect(()=>{
    if(!mobileOpen)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previousOverflow};
  },[mobileOpen]);
  const navItem=(href:string)=>pathname===href?'bg-white/12 text-white after:scale-x-100':'text-white/75 hover:bg-white/10 hover:text-white after:scale-x-0 hover:after:scale-x-100';
  return <header ref={headerRef} className="sticky top-0 z-[100] h-[68px] w-full sm:h-[76px]" aria-label="سربرگ وب‌سایت">
    <div className="mx-auto flex w-[90%] max-w-[1600px] items-start pt-1">
      <div dir="ltr" className={`relative flex w-full items-center justify-between gap-2 rounded-full border border-white/30 bg-[#202124]/65 px-3 text-white shadow-[0_10px_32px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.14)] backdrop-blur-[22px] transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] sm:gap-4 sm:px-5 ${scrolled?'h-[50px] -translate-y-1 border-white/40 bg-[#17191d]/85 shadow-[0_15px_40px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.18)] sm:h-[52px]':'h-[54px] translate-y-0 sm:h-[56px]'}`}>
        <Link href="/" aria-label="فرامید - صفحه اصلی" className="relative z-10 ml-[5%] inline-flex shrink-0 items-center rounded-lg py-1" onClick={()=>setMobileOpen(false)}>
          <Image src={brand.logo} alt="Faromid Group" width={273} height={72} priority className={`h-auto w-[120px] origin-left object-contain transition-transform duration-500 ease-out sm:w-[150px] ${scrolled?'scale-[.94]':'scale-100'}`}/>
        </Link>
        <span aria-hidden="true" className="hidden h-7 w-px shrink-0 bg-white/30 sm:block" />
        <nav aria-label="فهرست اصلی" dir="rtl" className="ml-auto hidden min-w-0 items-center gap-1 lg:mr-[3%] lg:flex 2xl:gap-2">
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
        <button ref={menuButtonRef} type="button" aria-label={mobileOpen?'بستن منو':'باز کردن منو'} aria-controls="faromid-mobile-menu" aria-expanded={mobileOpen} onClick={()=>{setMobileMoreOpen(secondary.some(item=>pathname===item.href));setMobileOpen(v=>!v)}}
          className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/35 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.2)] transition-all duration-300 hover:bg-white/20 active:scale-95 focus-visible:outline-white lg:hidden">
          {mobileOpen?<X size={22} className="transition-transform duration-300"/>:<Menu size={22} className="transition-transform duration-300"/>}
        </button>
        {mobileOpen&&<nav id="faromid-mobile-menu" aria-label="فهرست موبایل" dir="rtl" className="faromid-nav-dropdown absolute top-[calc(100%+8px)] right-0 left-0 z-20 max-h-[calc(100dvh-104px)] overflow-y-auto overscroll-contain rounded-[22px] border border-white/25 bg-[linear-gradient(145deg,rgba(48,50,54,.94),rgba(19,21,25,.92))] p-2 text-white shadow-[0_20px_56px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.16)] backdrop-blur-[30px] lg:hidden">
          <div className="grid gap-0.5">
            {primary.map(item=><Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} aria-current={pathname===item.href?'page':undefined}
              className={`flex min-h-10 items-center rounded-xl px-3.5 py-2 text-[12px] font-medium transition-colors focus-visible:outline-white ${pathname===item.href?'bg-[#bd2631]/20 text-white':'text-white/80 hover:bg-white/[0.07] hover:text-white active:bg-white/10'}`}>
              {item.label}
            </Link>)}
            <button type="button" aria-expanded={mobileMoreOpen} aria-controls="faromid-mobile-more" onClick={()=>setMobileMoreOpen(value=>!value)}
              className="flex min-h-10 w-full items-center justify-between rounded-xl px-3.5 py-2 text-right text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-white">
              بیشتر <ChevronDown size={15} className={`transition-transform duration-200 ${mobileMoreOpen?'rotate-180':''}`}/>
            </button>
            {mobileMoreOpen&&<div id="faromid-mobile-more" className="mr-2 grid gap-0.5 border-r border-white/15 pr-2">
              {secondary.map(item=><Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} aria-current={pathname===item.href?'page':undefined}
                className={`flex min-h-9 items-center rounded-lg px-3 py-1.5 text-[11px] transition-colors focus-visible:outline-white ${pathname===item.href?'bg-[#bd2631]/20 text-white':'text-white/65 hover:bg-white/[0.07] hover:text-white'}`}>
                {item.label}
              </Link>)}
            </div>}
          </div>
        </nav>}
      </div>
    </div>
  </header>;
}
