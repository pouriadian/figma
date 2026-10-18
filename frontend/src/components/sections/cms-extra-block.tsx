import Image from 'next/image';
import Link from 'next/link';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {ModernProductCarousel} from '@/components/ui/product-carousel';
import {getProducts} from '@/lib/api';
import type {CMSSection} from '@/lib/site-pages';

function ValidLink({url,label}:{url:string;label:string}){
  if (!url || !label || !(url.startsWith('/')&&!url.startsWith('//')||url.startsWith('https://')||url.startsWith('http://'))) return null;
  return <Link className="inline-flex rounded-xl bg-[#334d68] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#223a54]" href={url}>{label}</Link>;
}

/** Published CMS blocks from the Next.js /panel editor appear on the selected website page. */
export async function CMSExtraBlock({section}:{section:CMSSection}){
  if(section.kind==='products'){
    const products=await getProducts();
    const picked=section.product_ids.length?products.filter(p=>typeof p.id==='number'&&section.product_ids.includes(p.id)):products;
    return <section className="bg-[#f5f5f1] py-14 sm:py-20" id={`cms-${section.key}`}><Container><SectionTitle title={section.title||'محصولات'}/><ModernProductCarousel items={picked}/></Container></section>;
  }
  if(section.kind==='gallery'||section.kind==='cards'){
    const items=section.images.length?section.images:section.image?[{url:section.image,caption:section.title,alt:section.image_alt}]:[];
    if (!items.length) return null;
    return <section className="bg-[#f5f5f1] py-14 sm:py-20" id={`cms-${section.key}`}><Container>
      {section.title&&<SectionTitle title={section.title}/>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item,i)=><div key={`${item.url}-${i}`} className="overflow-hidden rounded-[20px] border border-[#e2e7e1] bg-white">
        <div className="relative aspect-[4/3]"><Image src={item.url} alt={item.alt||item.caption||section.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover"/></div>
        {item.caption&&<p className="px-4 pb-5 pt-2 text-sm text-[#606a62]">{item.caption}</p>}
      </div>)}</div>
      <ValidLink url={section.link_url} label={section.link_label}/>
    </Container></section>;
  }
  return <section className="bg-white py-14 sm:py-20" id={`cms-${section.key}`}><Container>
    <div className="grid items-center gap-8 md:grid-cols-2">
      {section.image&&<div className="relative min-h-[240px] overflow-hidden rounded-[22px] bg-[#ebede8] md:min-h-[360px]"><Image src={section.image} alt={section.image_alt||section.title} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover"/></div>}
      <div className={section.image?'':'md:col-span-2'}>
        {section.title&&<h2 className="mb-3 text-2xl font-bold text-[#202b29]">{section.title}</h2>}
        {section.subtitle&&<p className="text-base font-medium text-[#65736c]">{section.subtitle}</p>}
        {section.body&&<div className="cms-rich-content text-sm leading-[2.4] text-[#56645b]" dangerouslySetInnerHTML={{__html:section.body}}/>}
        <ValidLink url={section.link_url} label={section.link_label}/>
      </div>
    </div>
  </Container></section>;
}
