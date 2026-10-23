import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import type {CatalogProduct} from '@/lib/products-catalog';

/** Single source of truth for the product tile, shared by carousel and grid. */
export function ProductCard({product,priority=false,compact=false}:{product:CatalogProduct;priority?:boolean;compact?:boolean}) {
 return <Link href={product.href} aria-label={`مشاهده محصول ${product.name||'کلین تاچ'} کد ${product.code}`} className="group block h-full overflow-hidden rounded-[16px] border border-[#e8e9e5] bg-white shadow-[0_5px_24px_rgba(27,31,27,.045)] transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#c7cdc6] hover:shadow-[0_17px_36px_rgba(27,31,27,.11)] sm:rounded-[21px]">
   <div className={`relative w-full overflow-hidden bg-[#eeede8] ${compact?'aspect-square':'aspect-[1.3]'} sm:aspect-[.98] lg:aspect-[.89]`}><Image src={product.image} alt={`بافت MDF مدل ${product.model} کد ${product.code}`} fill priority={priority} sizes={compact?'(max-width:639px) 30vw, (max-width:1024px) 44vw, 25vw':'(max-width:600px) 46vw, (max-width:1024px) 30vw, 320px'} className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transform-none" />
     <span dir="ltr" className={`absolute rounded-full border border-white/65 bg-white/90 font-mono text-[#444b45] backdrop-blur-sm ${compact?'top-1 left-1 px-1.5 py-0.5 text-[8px] sm:top-3 sm:left-3 sm:px-3 sm:py-1.5 sm:text-[11px]':'top-1.5 left-1.5 px-2 py-1 text-[9px] sm:top-3 sm:left-3 sm:px-3 sm:py-1.5 sm:text-[11px]'}`}>{product.code}</span>
   </div>
   <div className={`flex items-center justify-between px-2 py-2 sm:gap-3 sm:px-5 sm:py-5 ${compact?'gap-1 sm:gap-3':'gap-2'}`}><div className="min-w-0"><h3 className={`m-0 font-semibold text-[#262c28] sm:text-[16px] ${compact?'text-[10px] leading-4 sm:text-[16px] sm:leading-6':'text-[12px] leading-5'}`}>{product.name||'کلین تاچ'} <span className="font-normal text-[#778078]" dir="ltr">{product.model}</span></h3><p className={`m-0 mt-1 text-[9px] text-[#7f8580] sm:mt-2 sm:text-xs ${compact?'hidden sm:block':''}`}>ابعاد: {product.dimensions}</p></div><ArrowUpLeft size={17} className={`${compact?'hidden sm:block':''} shrink-0 text-[#747b75] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 sm:h-[19px] sm:w-[19px]`} /></div>
 </Link>;
}
