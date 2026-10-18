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
      <Image src={src} width={1595} height={712} sizes="100vw" alt={content?.image_alt||'ارزش‌های سازمانی فرامید: نوآوری، مسئولیت اجتماعی، اعتماد، مشتری‌مداری، خلاقیت، کیفیت و برنامه‌ریزی استراتژیک'} className="block h-auto w-full object-contain" />
    </a>
    {content?.body?.trim()&&<div className="mx-auto max-w-4xl px-5 py-7 text-center text-sm leading-8 text-white/85" dangerouslySetInnerHTML={{__html:content.body}}/>}
  </section>;
}

export async function HomeGallery({content}: {content?:CMSSection}){
 const entries=await getContent('gallery');
 const pictures=content?.images?.length?content.images.map(item=>({src:item.url,title:item.caption||item.alt})):content?.image?[{src:content.image,title:content.title||"گالری"}]:entries.length?entries.map(item=>({src:item.image,title:item.title})):asset.interiors.map((src,index)=>({src,title:galleryNames[index]}));
 return <section className="bg-[#f5f5f1] py-16 sm:py-20"><Container>
  <SectionTitle title={content?.title||"گالری تصاویر"} action={{href:'/gallery',label:'بیشتر'}} />
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
    {pictures.map(({src,title},index)=><Link href="/gallery" key={src} className={`group relative block min-h-[245px] overflow-hidden rounded-[20px] bg-[#c8cbc6] sm:min-h-[290px] ${index===0?'lg:row-span-2 lg:min-h-[600px]':''}`} aria-label={title}>
      <Image src={src} alt={title} fill sizes="(max-width:650px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent px-5 pt-16 pb-5 text-white"><span className="text-[12px] font-medium sm:text-sm">{title}</span><ArrowUpLeft size={17} className="shrink-0 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" /></div>
    </Link>)}
  </div>
 </Container></section>;
}

const HISTORY_TEXT='Since 1975 the Caspany family has pursued its entrepreneurial path of tradition and innovation with passion and enthusiasm.';

/** A vertical, image-first editorial composition that editors can update through CMS. */
export function HomeHistory({content}: {content?:CMSSection}){
  return <section className="bg-white py-16 sm:py-24" aria-label="میراث فرامید">
    <div className="mx-auto w-full max-w-[1340px] px-4 sm:px-7 lg:px-12">
      <div className="mx-auto w-full overflow-hidden rounded-2xl bg-[#f6f5f2] sm:rounded-[28px]">
        <Image src={content?.image||brand.homeHistoryPanels} width={1200} height={540}
          alt={content?.image_alt||'نمایی از پانل‌های فرامید'} sizes="(max-width: 1340px) 100vw, 1244px"
          className="block h-auto w-full object-contain" />
      </div>
      <div className="mx-auto mt-10 max-w-[1000px] text-center sm:mt-14">
        <span className="mx-auto mb-5 block h-[3px] w-12 rounded-full bg-[#ca1722]" aria-hidden="true"/>
        <h2 dir="ltr" className="m-0 text-center font-serif text-[clamp(1.65rem,3.1vw,3.15rem)] font-medium leading-[1.45] tracking-[-.02em] text-[#252323]">
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
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
    {(content?.images?.length?content.images.map(item=>item.url):content?.image?[content.image]:asset.samples).map((src,i)=><Link href="/products" key={`${src}-${i}`} className="group block overflow-hidden rounded-[18px] border border-[#e5e7e1] bg-white transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(0,0,0,.09)]"><div className="relative aspect-[4/4.4] overflow-hidden bg-[#e6e7e3]"><Image src={src} alt={content?.images?.[i]?.alt||samples[i]||"سمپل فرامید"} fill sizes="(max-width:650px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.035]" /></div><h3 className="m-0 p-4 text-center text-sm font-medium">{content?.images?.[i]?.caption||samples[i]||"سمپل فرامید"}</h3></Link>)}
  </div>
 </Container></section>;
}
