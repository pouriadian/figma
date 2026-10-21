import Image from 'next/image';
import {SiteShell} from '@/components/layout/site-shell';
import {Container} from '@/components/ui/brand-ui';
import {ContactMessageModal} from '@/components/contact-message-modal';
import {asset} from '@/lib/assets';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function CareersView(){
  const page=await getSitePage('careers');
  const hero=getSection(page,'hero');
  const intro=getSection(page,'intro');
  const image=hero?.image||asset.careers;
  const title=hero?.title||'همکاری با ما';

  return <SiteShell>
    <section dir="rtl" aria-labelledby="careers-title" className="relative -mt-[68px] overflow-hidden bg-[linear-gradient(125deg,#202522,#343b36)] pt-[68px] text-white sm:-mt-[76px] sm:pt-[76px]">
      <Container className="w-full py-8 sm:py-12">
        <div dir="ltr" className="grid items-center gap-5 md:grid-cols-[minmax(240px,.82fr)_minmax(0,1.18fr)] md:gap-7 lg:gap-9">
          <div className="relative mx-auto h-[250px] w-full max-w-[360px] overflow-hidden rounded-[24px] bg-[#e8eae7] shadow-[0_16px_42px_rgba(0,0,0,.2)] md:mx-0 md:h-[350px] md:max-w-none lg:h-[400px]">
            <Image src={image} fill priority alt={hero?.image_alt||'همکاری و دست دادن دو نفر'} sizes="(max-width:767px) calc(100vw - 40px), (max-width:1023px) 280px, 340px" className="object-cover object-center" />
          </div>
          <div dir="rtl" className="w-fit max-w-full self-center rounded-[26px] border border-white/20 bg-[#202522]/25 p-5 shadow-[0_16px_48px_rgba(0,0,0,.08)] backdrop-blur-[2px] sm:p-7">
            <span dir="ltr" className="mb-3 block text-[10px] font-semibold tracking-[.24em] text-white/80 sm:text-xs">{hero?.subtitle||'FAROMID CAREERS'}</span>
            <h1 id="careers-title" className="m-0 max-w-[min(72vw,640px)] text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.25] text-white">{title}</h1>
            <div className="mt-4 max-w-xl text-sm leading-7 text-white/90 sm:text-base sm:leading-7">
              {intro?.body
                ? <div dangerouslySetInnerHTML={{__html:intro.body}}/>
                : 'فلسفه کاری در فرامید مبتنی بر احترام و اخلاق حرفه‌ای می‌باشد که منجر به ایجاد محیط کاری دوستانه بر اساس معیارهای بین‌المللی و توأم با پیشرفت و یادگیری مستمر است.'}
            </div>
            <div className="mt-6 flex justify-start">
              <ContactMessageModal type="careers" variant="glass"/>
            </div>
          </div>
        </div>
      </Container>
    </section>
    {page?.sections.filter(s=>s.enabled!==false&&!['hero','intro'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
  </SiteShell>;
}
