import Image from 'next/image';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {ProductCollection} from '@/components/sections/product-collection';
import {mediaWebp} from '@/lib/media';
import {getProducts,getCategories} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function ProductsView(){
  const [products,categories,page]=await Promise.all([getProducts(),getCategories(),getSitePage('products')]);
  const hero=getSection(page,'hero');
  return <SiteShell>
    <section className="relative isolate -mt-[68px] flex min-h-[350px] items-center overflow-hidden bg-[#343b36] pt-[68px] text-white sm:-mt-[76px] sm:min-h-[420px] sm:pt-[76px]">
      <Image src={hero?.image||mediaWebp('b64de2f4b544c1901affa3f8dce63e6f47283ee7','backgrounds')} alt={hero?.image_alt||hero?.title||'سطوح آنتی‌فینگر فرامید در فضای داخلی'} fill priority sizes="100vw" className="-z-20 object-cover object-center"/>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(270deg,rgba(20,25,22,.48)_0%,rgba(20,25,22,.2)_48%,rgba(20,25,22,.04)_100%)]"/>
      <Container className="relative w-full py-12 sm:py-16">
        <div className="max-w-[640px] rounded-[26px] border border-white/20 bg-[#202522]/25 p-5 shadow-[0_16px_48px_rgba(0,0,0,.08)] backdrop-blur-[2px] sm:p-8">
          <span dir="ltr" className="mb-3 block text-[10px] font-semibold tracking-[.24em] text-white/80 sm:text-xs">{hero?.subtitle||'FAROMID COLLECTION'}</span>
          <h1 dir="ltr" className="m-0 text-right text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.25] tracking-[-.035em] text-white">{hero?.title||'ANTI FINGER'}</h1>
          <p dir="rtl" className="mb-0 mt-4 max-w-xl text-sm leading-7 text-white/90 sm:text-base">سطوح فرامید را بر اساس بافت، جلوهٔ بصری یا کالکشن پیدا کنید.</p>
        </div>
      </Container>
    </section>
    <section className="bg-[#f4f4f0] py-12 sm:py-16"><Container><ProductCollection products={products} categories={categories}/></Container></section>
    {page?.sections.filter(section=>section.enabled!==false&&!['hero','featured','gallery'].includes(section.key)).map(section=><CMSExtraBlock key={section.key} section={section}/>)}
  </SiteShell>;
}
