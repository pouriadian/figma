import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import type {CatalogProduct} from '@/lib/products-catalog';

/** Single source of truth for the product tile, shared by carousel and grid. */
export function ProductCard({product,priority=false}:{product:CatalogProduct;priority?:boolean}) {
 return <Link href={product.href} aria-label={`مشاهده محصول ${product.name||'کلین تاچ'} کد ${product.code}`} className="group block h-full overflow-hidden rounded-[21px] border border-[#e8e9e5] bg-white shadow-[0_5px_24px_rgba(27,31,27,.045)] transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#c7cdc6] hover:shadow-[0_17px_36px_rgba(27,31,27,.11)]">
   <div className="relative aspect-[.89] w-full overflow-hidden bg-[#eeede8]"><Image src={product.image} alt={`بافت MDF مدل ${product.model} کد ${product.code}`} fill priority={priority} sizes="(max-width:600px) 82vw, (max-width:1024px) 45vw, 320px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transform-none" />
     <span dir="ltr" className="absolute top-3 left-3 rounded-full border border-white/65 bg-white/90 px-3 py-1.5 font-mono text-[11px] text-[#444b45] backdrop-blur-sm">{product.code}</span>
   </div>
   <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-5"><div className="min-w-0"><h3 className="m-0 text-[16px] font-semibold text-[#262c28]">{product.name||'کلین تاچ'} <span className="font-normal text-[#778078]" dir="ltr">{product.model}</span></h3><p className="m-0 mt-2 text-xs text-[#7f8580]">ابعاد: {product.dimensions}</p></div><ArrowUpLeft size={19} className="shrink-0 text-[#747b75] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1" /></div>
 </Link>;
}
