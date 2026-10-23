import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpLeft} from 'lucide-react';
import {asset} from '@/lib/assets';
import {brand} from '@/lib/media';
import {ModernProductCarousel} from '@/components/ui/product-carousel';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {getProducts,getContent} from '@/lib/api';
import type {CMSSection} from '@/lib/site-pages';

const samples=['سمپل آنتی فینگر','سمپل کیفی','سمپل هایگلاس','سمپل اولترا'];
const galleryNames=[
  'G2LAB | Monalia Hotel','Studio Arketo | Ristorante ExMahalo',
  'دکوراسیون داخلی مدرن','پروژه‌های معماری فرامید','اجرای دکوراسیون','طراحی فضای زندگی',
];

export async function HomeCollections({content}: {content?:CMSSection}){
 const products=await getProducts();
 const selected=content?.product_ids?.length?products.filter(product=>typeof product.id==='number'&&content.product_ids.includes(product.id)):products;
 return <section className="bg-[#f5f5f1] py-16 sm:py-20 lg:py-24"><Container>
   <SectionTitle title={content?.title||"محصولات"} action={{href:'/products',label:'بیشتر'}} />
   <ModernProductCarousel items={selected}/>
 </Container></section>;
}

/** The supplied image already contains its headline and all seven bilingual labels. */
export function HomeValues({content}: {content?:CMSSection}){
  const src=content?.image||'/assets/home/home-organizational-values.png';
  return <section className="w-full overflow-hidden bg-[#101014]" aria-label="ارزش‌های سازمانی">
    <a href={src} target="_blank" rel="noopener noreferrer" title="مشاهده تصویر ارزش‌های سازمانی با اندازه کامل" className="block w-full focus-visible:outline-offset-[-4px]">
      <Image src={src} width={1587} height={713} sizes="100vw" alt={content?.image_alt||'ارزش‌های سازمانی فرامید: نوآوری، مسئولیت اجتماعی، اعتماد، مشتری‌مداری، خلاقیت، کیفیت و برنامه‌ریزی استراتژیک'} className="block h-auto w-full object-contain" />
    </a>
    {content?.body?.trim()&&<div className="mx-auto max-w-4xl px-5 py-7 text-center text-sm leading-8 text-white/85" dangerouslySetInnerHTML={{__html:content.body}}/>}
  </section>;
}

export async function HomeGallery({content}: {content?:CMSSection}){
 const entries=await getContent('gallery');
 const pictures=content?.images?.length?content.images.map(item=>({src:item.url,title:item.caption||item.alt})):content?.image?[{src:content.image,title:content.title||"گالری"}]:entries.length?entries.map(item=>({src:item.image,title:item.title})):asset.interiors.map((src,index)=>({src,title:galleryNames[index]}));
 const useMosaic=pictures.length===6;
 const mosaicSlots=[
  'lg:col-span-5 lg:row-span-2',
  'lg:col-span-3',
  'lg:col-span-6',
  'lg:col-span-3',
  'lg:col-span-2',
  'lg:col-span-4',
 ];
 const mosaicSizes=['36vw','22vw','43vw','22vw','15vw','30vw'];
 return <section className="bg-[#f5f5f1] py-16 sm:py-20"><Container>
  <SectionTitle title={content?.title||"گالری تصاویر"} action={{href:'/gallery',label:'بیشتر'}} />
  <div dir="ltr" className={`grid grid-cols-2 auto-rows-[minmax(9rem,1fr)] gap-3 sm:gap-4 ${useMosaic?'lg:aspect-[2.2] lg:auto-rows-auto lg:grid-cols-[repeat(14,minmax(0,1fr))] lg:grid-rows-[1.2fr_1fr]':'lg:grid-cols-3'} lg:gap-5`}>
    {pictures.map(({src,title},index)=><Link href="/gallery" key={src} className={`group relative block min-h-[10rem] overflow-hidden rounded-[3px] bg-[#c8cbc6] ${index===0?'row-span-2 min-h-[21rem]':''} ${useMosaic?`${mosaicSlots[index]||''} lg:min-h-0`:''}`} aria-label={title}>
      <Image src={src} alt={title} fill sizes={useMosaic?`(max-width: 1024px) 50vw, ${mosaicSizes[index]||'30vw'}`:"(max-width:650px) 50vw, (max-width:1024px) 50vw, 33vw"} className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent px-4 pt-16 pb-4 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"><span className="text-[12px] font-medium sm:text-sm">{title}</span><ArrowUpLeft size={17} className="shrink-0 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" /></div>
    </Link>)}
  </div>
 </Container></section>;
}

const HISTORY_TEXT='Since 1975 the Caspany family has pursued its entrepreneurial path of tradition and innovation with passion and enthusiasm.';

/** A vertical, image-first editorial composition that editors can update through CMS. */
export function HomeHistory({content}: {content?:CMSSection}){
  return <section className="bg-white py-16 sm:py-24" aria-label="میراث فرامید">
    <div className="mx-auto w-full max-w-[1054px] px-4 sm:px-7 lg:px-9">
      <div className="mx-auto w-full max-w-[982px]">
        <Image src={brand.homeHistoryPanels} width={982} height={442}
          alt={content?.image_alt||'نمایی از پانل‌های فرامید'} sizes="(max-width: 982px) calc(100vw - 2rem), 982px"
          className="mx-auto block h-auto w-full object-contain" />
      </div>
        <div className="mx-auto mt-10 max-w-[1000px] text-center sm:mt-14">
          <h2 dir="ltr" className="m-0 text-center font-sans text-[clamp(1.125rem,1.55vw,1.5rem)] font-bold leading-[1.45] tracking-[-.01em] text-[#252323]">
          {content?.title||HISTORY_TEXT}
        </h2>
        {content?.subtitle&&<p className="mt-5 text-center text-lg text-[#5d5753]">{content.subtitle}</p>}
        {content?.body&&<div className="mx-auto mt-5 max-w-[740px] text-center text-[15px] leading-[2.1] text-[#68635f]" dangerouslySetInnerHTML={{__html:content.body}}/>}
      </div>
    </div>
  </section>;
}

export function HomeSamples({content}: {content?:CMSSection}){
 return <section className="bg-[#f5f5f1] py-16 sm:py-20"><Container>
  <SectionTitle title={content?.title||"سمپل‌ها"} action={{href:'/products',label:'بیشتر'}} />
  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-5">
    {(content?.images?.length?content.images.map(item=>item.url):content?.image?[content.image]:asset.samples).map((src,i)=><Link href="/products" key={`${src}-${i}`} className="group block overflow-hidden rounded-[14px] border border-[#e5e7e1] bg-white transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(0,0,0,.09)] sm:rounded-[18px]"><div className="relative aspect-[1.08] overflow-hidden bg-[#e6e7e3] sm:aspect-[4/4.4]"><Image src={src} alt={content?.images?.[i]?.alt||samples[i]||"سمپل فرامید"} fill sizes="(max-width:650px) 46vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.035]" /></div><h3 className="m-0 px-2 py-2.5 text-center text-xs font-medium sm:p-4 sm:text-sm">{content?.images?.[i]?.caption||samples[i]||"سمپل فرامید"}</h3></Link>)}
  </div>
 </Container></section>;
}
