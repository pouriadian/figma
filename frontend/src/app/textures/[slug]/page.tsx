import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {getTexture} from '@/lib/api';
import {getDevelopmentTexture} from '@/lib/texture-dev-fixtures';
import {MediaImage} from '@/components/ui/media-image';
import {TexturePreview} from '@/components/ui/texture-preview';
import {ProductCard} from '@/components/ui/product-card';

export const dynamic='force-dynamic';
async function loadTexture(slug:string){return await getTexture(slug)||getDevelopmentTexture(slug)}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const texture=await loadTexture(slug);
 return {title:texture?.seo_title||`${texture?.name||'بافت'} | فرامید`,description:texture?.seo_description||texture?.description||`بافت ${texture?.name||''} فرامید کد ${texture?.code||''}`};
}
export default async function TextureDetail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const texture=await loadTexture(slug);if(!texture)notFound();
 return <SiteShell><main dir="rtl" className="bg-[#f7f7f3] py-10 sm:py-16"><Container>
  <Link href="/textures" className="inline-flex items-center gap-2 text-sm text-[#707970] transition hover:text-[#252b26]"><ArrowRight size={17}/>بازگشت به بافت‌ها</Link>
  <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12"><div className="relative aspect-square overflow-hidden rounded-[22px] border border-[#e6e7e1] bg-white shadow-sm">{texture.is_demo?<TexturePreview slug={texture.slug} className="h-full w-full"/>:<MediaImage src={texture.image} alt={`بافت ${texture.name}`} priority sizes="(max-width:1024px) 100vw,50vw"/>}</div>
   <div className="flex flex-col justify-center"><span dir="ltr" className="text-[10px] font-semibold tracking-[.28em] text-[#92928a]">FAROMID TEXTURE</span><h1 className="mt-3 text-3xl font-extrabold text-[#222522] sm:text-5xl">{texture.name}</h1><p className="mt-3 text-sm text-[#6c756d]">کد بافت: <b dir="ltr" className="text-[#323832]">{texture.code}</b></p>{texture.category&&<p className="mt-2 text-sm text-[#6c756d]">دسته‌بندی: {texture.category}</p>}{texture.description&&<p className="mt-5 whitespace-pre-line text-sm leading-8 text-[#697269]">{texture.description}</p>}{Object.keys(texture.technical_specs||{}).length>0&&<dl className="mt-5 divide-y rounded-2xl border border-[#e2e4de] bg-white px-5">{Object.entries(texture.technical_specs).map(([key,value])=><div key={key} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-[#788179]">{key}</dt><dd className="m-0 text-left font-medium">{String(value)}</dd></div>)}</dl>}</div>
  </div>
  <section className="mt-14 border-t border-[#e2e4de] pt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><span dir="ltr" className="text-[9px] tracking-[.26em] text-[#8c9189]">COMPATIBLE PRODUCTS</span><h2 className="mt-2 text-2xl font-bold text-[#252a26]">محصولات سازگار</h2></div></div>{texture.products?.length?<div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{texture.products.map((product,index)=><ProductCard key={product.id??product.slug} product={product} priority={index<4}/>)}</div>:<p className="mt-4 rounded-2xl border border-dashed border-[#d9ddd7] bg-white p-6 text-sm text-[#6c756d]">هنوز محصول سازگاری برای این بافت ثبت نشده است.</p>}</section>
 </Container></main></SiteShell>;
}
