'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {CATALOG_PRODUCTS,type CatalogProduct} from '@/lib/products-catalog';
import {ProductCard} from './product-card';

type Props={items?:CatalogProduct[];className?:string};

/** Native scroll-snap: mouse-wheel, touch swipe, keyboard, and explicit arrow navigation. */
export function ModernProductCarousel({items=CATALOG_PRODUCTS,className=''}:Props) {
  const listRef=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState(0);
  const [visibleCount,setVisibleCount]=useState(1);
  const maxStart=Math.max(0,items.length-visibleCount);

  useEffect(()=>{
    const node=listRef.current;
    if(!node)return;
    const measure=()=>{
      const card=node.firstElementChild as HTMLElement | null;
      if(!card)return;
      const gap=parseFloat(getComputedStyle(node).columnGap)||16;
      setVisibleCount(Math.max(1,Math.floor((node.clientWidth+gap+.5)/(card.offsetWidth+gap))));
    };
    measure();
    const resize=new ResizeObserver(measure);
    resize.observe(node);
    return()=>resize.disconnect();
  },[items.length]);

  const goTo=useCallback((index:number)=>{
    const next=Math.max(0,Math.min(Math.max(0,items.length-visibleCount),index));
    const child=listRef.current?.children.item(next) as HTMLElement | null;
    child?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest',inline:'start'});
    setActive(next);
  },[items.length,visibleCount]);

  const onScroll=()=>{
    const node=listRef.current;
    if(!node)return;
    const right=node.getBoundingClientRect().right;
    let bestIndex=0;
    let bestDistance=Number.POSITIVE_INFINITY;
    Array.from(node.children).forEach((child,index)=>{
      const distance=Math.abs((child as HTMLElement).getBoundingClientRect().right-right);
      if(distance<bestDistance){bestDistance=distance;bestIndex=index;}
    });
    setActive(Math.min(bestIndex,Math.max(0,items.length-visibleCount)));
  };

  return <div className={className} dir="rtl">
    <div ref={listRef} onScroll={onScroll} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="اسلایدر محصولات فرامید" onKeyDown={event=>{
      if(event.key==='ArrowLeft'){event.preventDefault();goTo(active+1);}
      if(event.key==='ArrowRight'){event.preventDefault();goTo(active-1);}
    }} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-4 [scrollbar-width:none] [touch-action:pan-x_pan-y] sm:gap-5 [&::-webkit-scrollbar]:hidden">
      {items.map(product=><div key={product.id} className="w-[min(76vw,310px)] shrink-0 snap-start sm:w-[min(44vw,315px)] lg:w-[calc((100%-60px)/4)]"><ProductCard product={product}/></div>)}
    </div>
    <div className="mt-4 flex items-center justify-between gap-4">
      <div className="flex shrink-0 items-center gap-2" role="group" aria-label="کنترل محصولات">
        <button onClick={()=>goTo(active-1)} disabled={active<=0} aria-label="محصول قبلی" type="button" className="grid h-11 w-11 place-items-center rounded-full border border-[#d2d7d0] bg-white text-[#363b36] transition-colors hover:border-[#969f95] hover:bg-[#edf0ec] disabled:cursor-not-allowed disabled:opacity-35"><ArrowRight size={18}/></button>
        <button onClick={()=>goTo(active+1)} disabled={active>=maxStart} aria-label="محصول بعدی" type="button" className="grid h-11 w-11 place-items-center rounded-full border border-[#d2d7d0] bg-white text-[#363b36] transition-colors hover:border-[#969f95] hover:bg-[#edf0ec] disabled:cursor-not-allowed disabled:opacity-35"><ArrowLeft size={18}/></button>
      </div>
      <div className="flex min-w-0 items-center gap-3 font-mono text-xs tabular-nums text-[#7b847b]" dir="ltr">
        <span className="text-[#303731]">{String(Math.min(active+1,Math.max(1,items.length))).padStart(2,'0')}</span>
        <div aria-hidden className="h-1 w-[min(26vw,160px)] overflow-hidden rounded-full bg-[#dadfda]"><div className="h-full rounded-full bg-[#565e58] transition-[width] duration-300" style={{width:`${items.length?(active+visibleCount)/items.length*100:0}%`}}/></div>
        <span>{String(items.length).padStart(2,'0')}</span>
      </div>
    </div>
  </div>;
}
