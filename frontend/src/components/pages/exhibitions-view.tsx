import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {PageIntro} from '@/components/sections/page-intro';
import {EditorialGallery} from '@/components/sections/editorial-gallery';
import {asset} from '@/lib/assets';
import {getContent} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

const titles=['تصاویر نمایشگاه اول','تصاویر نمایشگاه دوم','تصاویر نمایشگاه سوم','تصاویر نمایشگاه چهارم'];

export async function ExhibitionsView() {
  const page=await getSitePage('exhibitions');
  const hero=getSection(page,'hero');
  const gallery=getSection(page,'gallery');
  const entries=await getContent('exhibition');
  const items=gallery?.images?.length
    ? gallery.images.map(image=>({src:image.url,title:image.caption||image.alt}))
    : gallery?.image ? [{src:gallery.image,title:gallery.title||'تصویر'}]
      : entries.length ? entries.map(e=>({src:e.image,title:e.title}))
        : asset.exhibitions.map((src,i)=>({src,title:titles[i]}));
  return <SiteShell>
    <PageIntro title={gallery?.title||hero?.title||'نمایشگاه‌ها'} subtitle="FAROMID EXHIBITIONS" description="نگاهی به حضور فرامید در نمایشگاه‌ها و رویدادهای تخصصی." image={hero?.image||asset.exhibitions[0]} compact/>
    <section className="bg-[#f5f5f1] py-14 sm:py-20"><Container>
      <EditorialGallery items={items} zoomable pageSize={3}/>
    </Container></section>
    {page?.sections.filter(s=>s.enabled!==false&&!['hero','gallery'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
  </SiteShell>;
}
