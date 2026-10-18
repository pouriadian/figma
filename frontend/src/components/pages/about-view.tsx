import Image from 'next/image';
import {SiteShell} from '@/components/layout/site-shell';
import {PageIntro} from '@/components/sections/page-intro';
import {Container,SectionTitle} from '@/components/ui/brand-ui';
import {asset} from '@/lib/assets';
import {getSitePage,getSection} from '@/lib/site-pages';
import {CMSExtraBlock} from '@/components/sections/cms-extra-block';

export async function AboutView(){const page=await getSitePage('about');const hero=getSection(page,'hero');const intro=getSection(page,'intro');return <SiteShell>
  <PageIntro title={hero?.title||"Since 1995"} subtitle={hero?.subtitle||"FAROMID GROUP"} image={hero?.image||asset.aboutHero}/>
  <section className="bg-[#f5f5f1] py-16 sm:py-24"><Container>
    <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-16">
      <div className="relative min-h-[320px] overflow-hidden rounded-[24px] bg-[#ddd] sm:min-h-[460px]"><Image src={intro?.image||asset.about} alt="شوروم و نمونه محصولات فرامید" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover"/></div>
      <div><SectionTitle title={intro?.title||"درباره فرامید"}/><div className="m-0 max-w-xl text-[15px] leading-[2.85] text-[#596058]">{intro?.body?<div dangerouslySetInnerHTML={{__html:intro.body}}/>:"گروه تولیدی فرامید فعالیت خود را در زمینه صنعت چوب و مبلمان از سال ۱۳۳۲ توسط آقای محمد فروز آغاز نمود. این مجموعه با تکیه بر تجربه، نوآوری و کیفیت، توسعه محصولات و ارائه متریال متنوع برای معماری و طراحی داخلی را دنبال می‌کند."}</div></div>
    </div>
  </Container></section>
{page?.sections.filter(s=>s.enabled!==false&&!['hero','intro'].includes(s.key)).map(s=><CMSExtraBlock key={s.key} section={s}/>)}
</SiteShell>}
