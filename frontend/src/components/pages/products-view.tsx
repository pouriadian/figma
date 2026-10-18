import Image from 'next/image';
import Link from 'next/link';
import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {ModernProductCarousel} from '@/components/ui/product-carousel';
import {ProductCollection} from '@/components/sections/product-collection';
import {asset} from '@/lib/assets';
import {mediaWebp} from '@/lib/media';
import {getProducts,getCategories} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function ProductsView(){const [products,categories,page]=await Promise.all([getProducts(),getCategories(),getSitePage('products')]);const hero=getSection(page,'hero');const featured=getSection(page,'featured');const gallery=getSection(page,'gallery');const selected=featured?.product_ids.length?products.filter(p=>typeof p.id==='number'&&featured.product_ids.includes(p.id)):products;return <SiteShell>
  <PageIntro title={hero?.title||"ANTI FINGER"} subtitle={hero?.subtitle||"Faromid Collection"} image={hero?.image||mediaWebp('b64de2f4b544c1901affa3f8dce63e6f47283ee7','backgrounds')}/>
  <section className="bg-white py-16 sm:py-20"><Container><SectionTitle title="محصولات فرامید"/><ProductCollection products={products} categories={categories}/></Container></section>
  {selected.length>0&&<section className="bg-[#f4f4f0] py-16 sm:py-20"><Container><SectionTitle title={featured?.title||"محصولات ویژه"}/><ModernProductCarousel items={selected}/></Container></section>}
  <section className="bg-[#f4f4f0] py-16 sm:py-20"><Container><SectionTitle title={gallery?.title||"تکسچر"} action={{href:'/textures',label:'بیشتر'}} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{(gallery?.images.length?gallery.images.map(item=>item.url):gallery?.image?[gallery.image]:asset.textures.slice(0,8)).map((src,i)=><Link key={src} href="/textures" className="group relative block aspect-[.8] overflow-hidden rounded-[17px] border border-[#e5e8e0] bg-[#e8e8e3]"><Image src={src} fill alt={`بافت فرامید شماره ${i+1}`} sizes="(max-width:600px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"/></Link>)}</div>
  </Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','featured','gallery'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
