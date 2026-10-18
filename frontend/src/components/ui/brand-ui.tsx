import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import type {ReactNode} from 'react';

export function Container({children,className='',as='div'}:{children:ReactNode;className?:string;as?:'div'|'section'}){
  const cls=`mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 2xl:px-16 ${className}`;
  return as==='section'?<section className={cls}>{children}</section>:<div className={cls}>{children}</div>;
}
export function SectionTitle({title,action}:{title:string;action?:{href:string;label:string}}){
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-10"><h2 className="m-0 text-[clamp(1.45rem,2.5vw,2.4rem)] leading-[1.5] font-semibold text-[#292c29]">{title}</h2>{action&&<Link href={action.href} className="group inline-flex items-center gap-2 border-b border-[#b9bfba] pb-2 text-[13px] text-[#4c534e] transition-colors hover:border-[#424743] hover:text-[#232825]">{action.label}<ArrowUpLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" /></Link>}</div>;
}
export function BrandLink({href,children,light=false,className=''}:{href:string;children:ReactNode;light?:boolean;className?:string}){
 return <Link href={href} className={`group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 py-3 text-[13px] font-semibold transition-[background-color,transform] duration-300 hover:-translate-y-0.5 ${light?'bg-white text-[#202422] hover:bg-[#e5e6e2]':'bg-[#252927] text-white hover:bg-[#444b46]'} ${className}`}>{children}<ArrowUpLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" /></Link>;
}
