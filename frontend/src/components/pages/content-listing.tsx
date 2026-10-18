import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import {Container} from '@/components/ui/brand-ui';
import type {CMSItem} from '@/lib/api';

export function ContentListing({items,title,base}:{items:CMSItem[];title:string;base:string}){
 return <section className="min-h-[70vh] bg-[#f5f5f1] py-16 sm:py-24"><Container><div className="mb-12 flex items-center justify-between border-b border-[#dfe3dc] pb-7"><h1 className="m-0 text-[clamp(2rem,3vw,3.3rem)] font-semibold text-[#273028]">{title}</h1><span className="text-xs text-[#9ca49c]">FAROMID GROUP</span></div>
  {items.length?<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><Link key={item.id} href={`${base}/${encodeURIComponent(item.slug)}`} className="group overflow-hidden rounded-[22px] border border-[#e2e7e0] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(26,34,28,.08)]"><div className="relative aspect-[1.4] overflow-hidden bg-[#e0e4e0]">{item.image&&<Image src={item.image} fill alt={item.title} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"/>}</div><div className="flex items-start justify-between gap-3 p-6"><div><h2 className="m-0 text-lg font-semibold">{item.title}</h2>{item.summary&&<p className="mt-3 text-sm leading-7 text-[#6e786f]">{item.summary}</p>}</div><ArrowUpLeft size={19} className="shrink-0 text-[#647367]"/></div></Link>)}</div>:<p className="rounded-2xl bg-white p-12 text-center text-sm text-[#808a81]">محتوایی برای نمایش منتشر نشده است.</p>}
 </Container></section>;
}
