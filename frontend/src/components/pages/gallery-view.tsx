import Image from 'next/image';
import {SiteShell} from '@/components/layout/site-shell';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
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
    <section className="bg-[#f5f5f1] py-14 sm:py-20">
      <Container>
        {hero?.image && <div className="relative mb-8 aspect-[16/5] min-h-[190px] overflow-hidden rounded-[22px]">
          <Image src={hero.image} alt={hero.image_alt||hero.title||'بنر گالری'} fill sizes="100vw" className="object-cover"/>
        </div>}
        <SectionTitle title={gallery?.title||hero?.title||'پروژه‌ها'}/>
        <EditorialGallery items={items}/>
      </Container>
    </section>
    {page?.sections.filter(s=>s.enabled!==false&&!['hero','gallery'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
  </SiteShell>;
}
