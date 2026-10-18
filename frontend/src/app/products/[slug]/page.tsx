import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import {SiteShell} from '@/components/layout/site-shell';
import {ModernProductCarousel} from '@/components/ui/product-carousel';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {getProduct,getProducts} from '@/lib/api';
import {ContactForm} from '@/components/contact-form';
import {ProductAnalytics} from '@/components/product-analytics';

// Published products are served by Django; do not statically generate demo-product slugs.
export const dynamic = 'force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;
 const product=await getProduct(slug);
 return {title:product?.seo_title|| (product?`${product.name} – ${product.code}`:'محصول یافت نشد'), description: product?.seo_description|| (product?`مشخصات ${product.name} فرامید کد ${product.code}`:undefined)};
}
export default async function ProductDetail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const product=await getProduct(slug);
 if(!product)notFound();
 const related=(await getProducts()).filter(item=>item.id!==product.id).slice(0,8);
 return <SiteShell><ProductAnalytics id={product.id} path={`/products/${slug}`}/>
  <section className="bg-[#f5f5f1] py-9 sm:py-16"><Container>
   <Link href="/products" className="mb-8 inline-flex items-center gap-2 text-[13px] text-[#68736a] transition-colors hover:text-[#272f28]"><ArrowRight size={17}/> بازگشت به محصولات</Link>
   <div className="grid gap-8 lg:grid-cols-[1.07fr_.93fr] lg:gap-16">
    <div className="relative aspect-[1/.92] overflow-hidden rounded-[24px] border border-[#e0e2dc] bg-white"><Image src={product.image||"/assets/products/textures/texture-1.webp"} alt={`طرح MDF فرامید ${product.name} کد ${product.code}`} fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" /></div>
    <div className="flex flex-col justify-center"><h1 className="m-0 text-[clamp(2rem,3.5vw,3.5rem)] font-semibold leading-[1.55]">{product.name} | {product.model}</h1><p className="mb-0 mt-2 text-sm text-[#727a73]">کد محصول: <strong dir="ltr" className="text-[#3a423b]">{product.code}</strong></p>
     <dl className="mt-8 divide-y divide-[#dfe3dc] border-y border-[#dfe3dc]">{[['مدل',product.model],['کد',product.code],['ابعاد',product.dimensions],['نوع',product.category_name||'MDF دکوراتیو']].map(([label,value])=><div key={label} className="flex items-center justify-between gap-4 py-4 text-[14px]"><dt className="text-[#788179]">{label}</dt><dd className="m-0 font-medium text-[#333a33]">{value}</dd></div>)}</dl>
     {product.technical_specs&&Object.keys(product.technical_specs).length>0&&<dl className="mt-6 divide-y divide-[#dfe3dc] rounded-2xl border border-[#dfe3dc] bg-white px-5">{Object.entries(product.technical_specs).map(([key,value])=><div key={key} className="flex justify-between gap-4 py-3 text-sm"><dt className="text-[#788179]">{key}</dt><dd className="m-0 text-left font-medium text-[#333a33]">{String(value)}</dd></div>)}</dl>}
     {product.description&&<p className="mt-6 whitespace-pre-line text-[13px] leading-[2.3] text-[#697269]">{product.description}</p>}
     <p className="mt-7 text-[13px] leading-[2.3] text-[#697269]">تصاویر نمونه ممکن است از نظر نور و رنگ در نمایشگرهای مختلف متفاوت باشند. برای اطلاعات فنی یا ثبت درخواست، با دفتر فروش تماس بگیرید.</p>
     {product.catalog_url&&<a href={product.catalog_url} target="_blank" rel="noopener noreferrer" className="mt-5 text-sm underline underline-offset-4">دریافت کاتالوگ PDF</a>}
     <div className="mt-6 rounded-3xl border border-[#e0e4de] bg-white p-5 sm:p-7"><h2 className="mb-5 text-lg font-semibold">استعلام قیمت و اطلاعات محصول</h2><ContactForm type="quote" productId={product.id}/></div>
    </div>
   </div>
   {product.images&&product.images.length>0&&<div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{product.images.map(img=><div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-[#e5e7e3]"><Image src={img.url} fill alt={img.caption||product.name} sizes="(max-width:640px) 50vw, 25vw" className="object-cover"/></div>)}</div>}
  </Container></section>
  <section className="bg-white py-14 sm:py-20"><Container><SectionTitle title="محصولات" action={{href:'/products',label:'بیشتر'}}/><ModernProductCarousel items={related}/></Container></section>
 </SiteShell>
}
