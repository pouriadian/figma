import Image from 'next/image';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {ProductCollection} from '@/components/sections/product-collection';
import {mediaWebp} from '@/lib/media';
import {getProducts,getCategories} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';
import {ProductCustomization} from '@/components/sections/product-customization';
import {ProductCategoryShowcase} from '@/components/sections/product-category-showcase';

export async function ProductsView(){
  const [products,categories,page]=await Promise.all([getProducts(),getCategories(),getSitePage('products')]);
  const hero=getSection(page,'hero');
  return <SiteShell>
    <section className="relative isolate -mt-[68px] flex min-h-[350px] items-center overflow-hidden bg-[#241e1b] pt-[68px] text-white sm:-mt-[76px] sm:min-h-[465px] sm:pt-[76px]"><Image src="/assets/products-page/Faromid_Products_Background.png" alt={hero?.image_alt||'محصولات فرامید'} fill priority sizes="100vw" className="-z-20 object-cover object-center"/><div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(270deg,rgba(25,17,13,.78)_0%,rgba(25,17,13,.18)_55%,rgba(25,17,13,.05)_100%)]"/><Container className="relative w-full"><div className="mr-0 max-w-[590px] text-right max-sm:mx-auto max-sm:text-center"><span dir="ltr" className="mb-3 block text-[10px] font-semibold tracking-[.32em] text-white/70 sm:text-xs">FAROMID PRODUCTS</span><h1 className="m-0 text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-none tracking-[-.055em] text-white">محصولات</h1><span dir="ltr" className="mt-4 block text-sm tracking-[.42em] text-white/80">PRODUCTS</span></div></Container></section>
    <ProductCategoryShowcase categories={categories}/>
    <section className="bg-[#f4f4f0] py-12 sm:py-16"><Container><ProductCollection products={products} categories={categories}/></Container></section>
    <ProductCustomization/>
    {page?.sections.filter(section=>section.enabled!==false&&!['hero','featured','gallery'].includes(section.key)).map(section=><CMSExtraBlock key={section.key} section={section}/>)}
  </SiteShell>;
}
