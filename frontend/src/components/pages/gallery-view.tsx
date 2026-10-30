import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {PageIntro} from '@/components/sections/page-intro';
import {EditorialGallery} from '@/components/sections/editorial-gallery';
import {asset} from '@/lib/assets';
import {getContent} from '@/lib/api';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

const titles = [
  'G2LAB | Monalia Hotel', 'Studio Arketo | Ristorante ExMahalo',
  'دکوراسیون داخلی مدرن', 'پروژه‌های معماری فرامید',
  'اجرای دکوراسیون', 'طراحی فضای زندگی'
];

export async function GalleryView() {
  const page = await getSitePage('gallery');
  const hero = getSection(page, 'hero');
  const gallery = getSection(page, 'gallery');
  const entries = await getContent('gallery');
  const items = gallery?.images?.length
    ? gallery.images.map(image => ({src:image.url,title:image.caption||image.alt}))
    : gallery?.image ? [{src:gallery.image,title:gallery.title||'تصویر'}]
      : entries.length ? entries.map(e => ({src:e.image,title:e.title}))
        : asset.interiors.map((src,i) => ({src,title:titles[i]}));
  return <SiteShell>
    <PageIntro title={gallery?.title||hero?.title||'پروژه‌ها'} subtitle="FAROMID PROJECTS" description="نگاهی به فضاها و پروژه‌هایی که با محصولات فرامید شکل گرفته‌اند." image={hero?.image||asset.interiors[0]} compact/>
    <section className="bg-[#f5f5f1] py-14 sm:py-20">
      <Container>
        <EditorialGallery items={items} zoomable pageSize={6}/>
      </Container>
    </section>
    {page?.sections.filter(s=>s.enabled!==false&&!['hero','gallery'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
  </SiteShell>;
}
