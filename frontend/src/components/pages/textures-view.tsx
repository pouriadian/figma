import Image from 'next/image';
import Link from 'next/link';
import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {asset} from '@/lib/assets';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function TexturesView(){const page=await getSitePage('textures');const hero=getSection(page,'hero');const gallery=getSection(page,'gallery');return <SiteShell>
  <PageIntro title={hero?.title||"بافت و تکسچر محصولات"} image={hero?.image||asset.textures[4]} compact/>
  <section className="bg-[#f5f5f1] py-14 sm:py-20"><Container>
    <SectionTitle title={gallery?.title||"بافت و تکسچر محصولات"} />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">{(gallery?.images?.length?gallery.images.map(item=>item.url):gallery?.image?[gallery.image]:asset.textures).map((src,i)=><Link key={`${src}-${i}`} href="/products" className="group relative block aspect-[.82] overflow-hidden rounded-[18px] border border-[#e4e8e1] bg-white shadow-[0_5px_20px_rgba(0,0,0,.035)] transition-shadow duration-300 hover:shadow-[0_16px_30px_rgba(0,0,0,.09)]"><Image src={src} fill alt={`بافت و تکسچر شماره ${i+1}`} sizes="(max-width:650px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" /></Link>)}</div>
  </Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','gallery'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
